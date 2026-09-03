import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SUPABASE_URL, VAPID_PUBLIC_KEY } from '../sync/config';
import { supabase } from '../sync/supabaseClient';
import { useAuthSession } from '../sync/auth';

/**
 * Les notifications, côté appareil.
 *
 * Ce qu'il faut comprendre pour que la suite se lise : ce n'est pas
 * l'application qui déclenche les rappels. Elle ne fait qu'inscrire
 * l'appareil auprès du service de notifications du navigateur, et déposer
 * cette inscription sur le serveur. C'est ensuite le serveur, seul, qui
 * envoie — sans quoi rien n'arriverait jamais quand l'app est fermée,
 * c'est-à-dire précisément quand on a besoin d'être prévenu.
 *
 * Une inscription appartient à UN navigateur, identifiée par son
 * « endpoint ». Le téléphone et le Mac en ont chacun une, distincte. C'est
 * ce qui fait qu'ouvrir un autre compte sur le Mac ne coupe rien sur le
 * téléphone : ce sont deux lignes séparées, et seule celle du Mac change
 * de destinataire.
 *
 * Et l'inscription suit toujours le compte connecté ici : se connecter
 * réattribue la ligne de cet appareil, se déconnecter la supprime. Un
 * appareil ne peut donc jamais recevoir les rappels d'un compte qui n'est
 * plus le sien.
 */

export type NotifyPrefs = {
  enabled: boolean;
  /** rappels posés d'office sur un nouvel événement, en minutes avant */
  defaultAlerts: number[];
  /** événement d'une journée entière : 0 = le jour même, 1 = la veille */
  allDayLead: number;
  /** …et à quelle heure, en minutes depuis minuit */
  allDayTime: number;
  quietEnabled: boolean;
  quietFrom: number;
  quietTo: number;
  tz: string;
};

export const DEFAULT_PREFS: NotifyPrefs = {
  enabled: true,
  defaultAlerts: [10],
  allDayLead: 1,
  allDayTime: 20 * 60,
  quietEnabled: false,
  quietFrom: 22 * 60,
  quietTo: 7 * 60,
  tz: 'Europe/Paris',
};

const isWeb = Platform.OS === 'web';

/** Vrai si ce navigateur sait recevoir des notifications poussées. */
export function pushSupported(): boolean {
  return (
    isWeb &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Sur iPhone, les notifications web n'existent QUE dans une app ajoutée à
 * l'écran d'accueil. Dans l'onglet Safari, le bouton ne servirait à rien —
 * autant le dire plutôt que de laisser échouer.
 */
export function needsHomeScreen(): boolean {
  if (!isWeb || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  if (!iOS) return false;
  const standalone =
    (window.navigator as any).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches;
  return !standalone;
}

/**
 * La clé publique VAPID, telle que `pushManager.subscribe` la réclame :
 * des octets bruts, adossés à un vrai `ArrayBuffer` (et non au tampon
 * générique que produirait `Uint8Array.from`, que la signature de l'API
 * refuse).
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Un nom lisible pour reconnaître l'appareil dans la liste. */
function deviceLabel(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC';
  return 'Appareil';
}

function localTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_PREFS.tz;
  } catch {
    return DEFAULT_PREFS.tz;
  }
}

type SubShape = { endpoint: string; p256dh: string; auth: string };

function readSubscription(sub: PushSubscription): SubShape | null {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** Dépose (ou réattribue) l'inscription de cet appareil sous le compte connecté. */
async function claim(sub: SubShape) {
  await supabase.from('push_devices').upsert(
    {
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      label: deviceLabel(),
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
}

/* --- l'inscription de cet appareil --------------------------------------- */

export function usePushDevice() {
  const session = useAuthSession();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = pushSupported();
  const permission =
    supported && typeof Notification !== 'undefined' ? Notification.permission : 'default';

  /*
    À chaque changement de compte, l'inscription déjà prise sur cet
    appareil est réattribuée au nouveau compte — et retirée s'il n'y en a
    plus. Sans ça, un appareil continuerait de recevoir les rappels du
    compte précédent, ce qui est exactement le mélange qu'on refuse.
  */
  useEffect(() => {
    if (!supported || session === undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (!sub) {
          setActive(false);
          return;
        }
        const shape = readSubscription(sub);
        if (!shape) return;
        if (session) {
          await claim(shape);
          if (!cancelled) setActive(true);
        } else {
          // plus personne n'est connecté : cet appareil ne doit plus rien recevoir
          await supabase.from('push_devices').delete().eq('endpoint', shape.endpoint);
          if (!cancelled) setActive(false);
        }
      } catch {
        // pas de service worker (page servie hors PWA) : rien à faire
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, session]);

  const enable = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("Ce navigateur ne sait pas recevoir de notifications.");
      return false;
    }
    if (!session) {
      setError('Connectez-vous d’abord : c’est le compte qui reçoit les rappels.');
      return false;
    }
    setBusy(true);
    try {
      const granted = await Notification.requestPermission();
      if (granted !== 'granted') {
        setError(
          granted === 'denied'
            ? 'Notifications refusées. À réautoriser dans les réglages du téléphone.'
            : 'Autorisation non accordée.',
        );
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const shape = readSubscription(sub);
      if (!shape) {
        setError("L'inscription n'a pas abouti.");
        return false;
      }
      await claim(shape);
      // le fuseau de l'appareil sert au serveur à placer « 18:00 » dans le temps réel
      await supabase
        .from('notify_prefs')
        .upsert({ user_id: session.user.id, tz: localTz() }, { onConflict: 'user_id' });
      setActive(true);
      return true;
    } catch (e) {
      setError("Impossible d'activer les notifications sur cet appareil.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, session]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const shape = readSubscription(sub);
        if (shape) await supabase.from('push_devices').delete().eq('endpoint', shape.endpoint);
        await sub.unsubscribe();
      }
      setActive(false);
    } catch {
      setError("La désinscription n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Demande au serveur d'envoyer tout de suite une notification d'essai. */
  const test = useCallback(async (): Promise<string> => {
    if (!session) return 'Connectez-vous d’abord.';
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) return 'Envoyée — elle devrait arriver dans quelques secondes.';
      if (json?.reason === 'aucun appareil inscrit') return 'Aucun appareil inscrit sur ce compte.';
      return "L'envoi n'a pas abouti.";
    } catch {
      return 'Serveur injoignable.';
    }
  }, [session]);

  return { supported, permission, active, busy, error, enable, disable, test };
}

/* --- les réglages, partagés par tous les appareils du compte -------------- */

const fromRow = (r: any): NotifyPrefs => ({
  enabled: r.enabled ?? true,
  defaultAlerts: Array.isArray(r.default_alerts) ? r.default_alerts : DEFAULT_PREFS.defaultAlerts,
  allDayLead: r.all_day_lead ?? DEFAULT_PREFS.allDayLead,
  allDayTime: r.all_day_time ?? DEFAULT_PREFS.allDayTime,
  quietEnabled: r.quiet_enabled ?? false,
  quietFrom: r.quiet_from ?? DEFAULT_PREFS.quietFrom,
  quietTo: r.quiet_to ?? DEFAULT_PREFS.quietTo,
  tz: r.tz ?? DEFAULT_PREFS.tz,
});

const toRow = (p: NotifyPrefs, userId: string) => ({
  user_id: userId,
  enabled: p.enabled,
  default_alerts: p.defaultAlerts,
  all_day_lead: p.allDayLead,
  all_day_time: p.allDayTime,
  quiet_enabled: p.quietEnabled,
  quiet_from: p.quietFrom,
  quiet_to: p.quietTo,
  tz: p.tz,
  updated_at: Date.now(),
});

/**
 * Les réglages vivent sur le serveur, pas sur l'appareil.
 *
 * C'est ce qui rend « 30 minutes avant » vrai partout dès qu'on le change
 * quelque part : c'est le serveur qui envoie, il lit donc un seul jeu de
 * réglages par compte. Un réglage gardé en local n'aurait servi qu'à
 * l'appareil qui l'a saisi, et n'aurait rien changé aux envois.
 */
export function useNotifyPrefs() {
  const session = useAuthSession();
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (session === undefined) return;
    let cancelled = false;
    setReady(false);
    // au changement de compte, on repart des valeurs par défaut : jamais
    // celles de la personne précédente, même le temps d'un aller-retour
    setPrefs(DEFAULT_PREFS);
    if (!session) {
      setReady(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('notify_prefs')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setPrefs(data ? fromRow(data) : { ...DEFAULT_PREFS, tz: localTz() });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const update = useCallback(
    (patch: Partial<NotifyPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        if (session) {
          supabase
            .from('notify_prefs')
            .upsert(toRow(next, session.user.id), { onConflict: 'user_id' })
            .then(() => {});
        }
        return next;
      });
    },
    [session],
  );

  return { prefs, update, ready, connected: !!session };
}
