import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { addDays, toKey } from '../lib/date';
import { uid } from '../lib/id';
import { occurrenceId, occurrenceKeys, splitOccurrenceId } from '../lib/repeat';
import { useAuthSession } from '../sync/auth';
import { deviceIdSync } from '../sync/device';
import { alive, collectGarbage, mergeById } from '../sync/merge';
import type { Syncable } from '../sync/types';
import type { AgendaEvent, Draft } from '../types';

// version bumpée : les anciens exemples de démonstration, déjà enregistrés
// dans le stockage des appareils existants, sont ainsi ignorés eux aussi —
// l'app démarre désormais toujours vierge
const BASE_KEY = 'agenda.events.v2';

/**
 * La clé de stockage local dépend du compte connecté.
 *
 * Sans ça, deux personnes qui se connectent tour à tour sur le même
 * appareil (le Mac de la maison, par exemple) partageraient le même
 * cache local : la seconde verrait les fiches de la première tant que
 * la synchronisation n'a pas eu le temps de tout redescendre, et pire —
 * ses propres écritures locales resteraient marquées comme siennes et
 * finiraient poussées sur le compte de l'autre. Une clé par compte rend
 * les deux caches aussi étanches que le sont déjà les tables sur le
 * serveur (RLS, `user_id = auth.uid()`) : brancher un autre compte, sur
 * le même appareil, revient à ouvrir un tiroir différent.
 */
function storageKeyFor(userId: string | null): string {
  return userId ? `${BASE_KEY}.${userId}` : BASE_KEY;
}

/**
 * Ce qu'une modification touche, quand la fiche appartient à une routine.
 *
 * `one` détache l'occasion : la mère saute ce jour-là, et une fiche
 * ordinaire prend sa place. `all` retouche la règle elle-même.
 */
export type Scope = 'one' | 'all';

type Store = {
  ready: boolean;
  events: AgendaEvent[];
  /** tout, pierres tombales comprises — c'est ce que la synchronisation pousse */
  rows: Syncable<AgendaEvent>[];
  byDay: Record<string, AgendaEvent[]>;
  eventsOn: (key: string) => AgendaEvent[];
  save: (draft: Draft, scope?: Scope) => AgendaEvent;
  remove: (id: string, scope?: Scope) => void;
  toggleDone: (id: string) => void;
  /**
   * Pose ces rappels sur les fiches à venir qui n'en portent aucun, et
   * renvoie combien ont changé. Sert à rattraper un agenda déjà rempli le
   * jour où l'on active les notifications : sans ça, il faudrait rouvrir
   * chaque fiche une par une pour qu'elles sonnent enfin.
   */
  applyDefaultAlerts: (alerts: number[]) => number;
  /** fusionne des lignes venues du serveur ; « dernier écrit gagne », fiche par fiche */
  mergeRemote: (rows: Syncable<AgendaEvent>[]) => void;
};

const EventsContext = createContext<Store | null>(null);

function sortEvents<T extends AgendaEvent>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if (a.start !== b.start) return a.start - b.start;
    return a.createdAt - b.createdAt;
  });
}

/** Complète une fiche enregistrée avant que la synchronisation n'existe. */
function adopt(e: Partial<Syncable<AgendaEvent>>): Syncable<AgendaEvent> {
  return {
    ...(e as AgendaEvent),
    updatedAt: e.updatedAt ?? e.createdAt ?? 0,
    deletedAt: e.deletedAt ?? null,
    origin: e.origin ?? '',
    // les fiches écrites avant les routines n'ont aucun de ces champs
    repeat: e.repeat ?? null,
    skips: e.skips ?? [],
    doneDates: e.doneDates ?? [],
    alerts: e.alerts ?? [],
  };
}

/*
  La fenêtre de calcul des routines.

  Une routine sans fin est infinie ; il faut bien décider jusqu'où on la
  déroule pour l'afficher. Un an en arrière et trois ans devant couvrent
  tout ce qu'on consulte réellement dans un agenda personnel, y compris la
  vue Année qu'on fait défiler, pour un coût mémoire qui reste modeste
  (une routine quotidienne y tient en quinze cents dates).

  Les événements uniques, eux, ne sont jamais filtrés par cette fenêtre :
  une fiche posée dans cinq ans doit rester visible, et elle ne coûte rien.
*/
const HORIZON_BACK_DAYS = 400;
const HORIZON_FORWARD_DAYS = 1100;

/** Déroule les routines en occurrences ; les fiches uniques passent telles quelles. */
function expand(list: AgendaEvent[], fromK: string, toK: string): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  for (const e of list) {
    if (!e.repeat) {
      out.push(e);
      continue;
    }
    const skipped = new Set(e.skips ?? []);
    const checked = new Set(e.doneDates ?? []);
    for (const key of occurrenceKeys(e.date, e.repeat, fromK, toK)) {
      if (skipped.has(key)) continue;
      out.push({
        ...e,
        id: occurrenceId(e.id, key),
        date: key,
        done: checked.has(key),
        seriesId: e.id,
      });
    }
  }
  return out;
}

/** Ajoute (ou retire) une date dans une liste, sans doublon et triée. */
function toggleDate(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key].sort();
}

const withDate = (list: string[], key: string) =>
  list.includes(key) ? list : [...list, key].sort();

/** Le nombre de jours entre deux clés — sert à décaler l'ancre d'une série. */
function daysBetween(fromK: string, toK: string): number {
  const a = new Date(`${fromK}T00:00:00`).getTime();
  const b = new Date(`${toK}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Syncable<AgendaEvent>[]>([]);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // undefined tant qu'on ne sait pas encore s'il y a une session : on
  // attend plutôt que de charger d'abord le mauvais tiroir par défaut
  const session = useAuthSession();
  const storageKey = storageKeyFor(session?.user?.id ?? null);

  useEffect(() => {
    if (session === undefined) return;
    hydrated.current = false;
    setReady(false);
    setRows([]); // jamais laisser voir, même une frame, le cache du compte précédent
    (async () => {
      try {
        /*
          Volontairement pas de reprise automatique du tiroir anonyme ici :
          sur un appareil déjà utilisé par quelqu'un d'autre avant la
          connexion, ce tiroir contient SES fiches à elle, pas celles du
          compte qui se connecte maintenant — le reprendre reproduirait
          exactement le mélange que ces clés par compte existent pour
          empêcher. Une fiche créée hors connexion, sur un appareil qui
          passe ensuite à plusieurs comptes, reste dans son tiroir d'origine.
        */
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Syncable<AgendaEvent>>[];
          if (Array.isArray(parsed)) setRows(sortEvents(parsed.map(adopt)));
        }
      } catch {
        // premier lancement / storage illisible : on démarre à vide
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, [storageKey, session]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(collectGarbage(rows))).catch(() => {});
  }, [rows, storageKey]);

  /*
    Les bornes du déroulé des routines, posées une fois pour la session.
    Elles ne bougent pas d'un rendu à l'autre : une fenêtre recalculée en
    continu ferait repasser tout le calendrier à chaque minute.
  */
  const horizon = useMemo(() => {
    const now = new Date();
    return {
      from: toKey(addDays(now, -HORIZON_BACK_DAYS)),
      to: toKey(addDays(now, HORIZON_FORWARD_DAYS)),
    };
  }, []);

  /* Ce que voit l'application : les fiches vivantes, routines déroulées. */
  const events = useMemo(
    () => expand(alive(rows), horizon.from, horizon.to),
    [rows, horizon],
  );

  const byDay = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const e of events) (map[e.date] ??= []).push(e);
    for (const k of Object.keys(map)) map[k] = sortEvents(map[k]);
    return map;
  }, [events]);

  const eventsOn = useCallback((key: string) => byDay[key] ?? [], [byDay]);

  /**
   * Enregistre une fiche — et, quand elle appartient à une routine, décide
   * si l'on retouche la règle ou seulement l'occasion.
   *
   * Le cas délicat est « toute la série » : la fiche ouverte porte la date
   * de SON occurrence, pas celle qui ancre la série. Recopier cette date
   * telle quelle déplacerait le départ de la routine au jour qu'on était
   * en train de regarder, effaçant d'un coup tout ce qui précède. On
   * reporte donc l'écart : décaler une occurrence de deux jours décale
   * toute la série de deux jours, ne pas y toucher ne bouge rien.
   */
  const save = useCallback((draft: Draft, scope: Scope = 'all') => {
    const now = Date.now();
    const occ = draft.id ? splitOccurrenceId(draft.id) : null;

    const base = (id: string, date: string): Syncable<AgendaEvent> => ({
      ...draft,
      title: draft.title.trim() || 'Sans titre',
      id,
      date,
      createdAt: draft.createdAt ?? now,
      repeat: draft.repeat ?? null,
      skips: draft.skips ?? [],
      doneDates: draft.doneDates ?? [],
      alerts: draft.alerts ?? [],
      seriesId: undefined,
      updatedAt: now,
      deletedAt: null,
      origin: deviceIdSync(),
    });

    /* Une occasion détachée : la mère saute ce jour, une fiche seule le prend. */
    if (occ && scope === 'one') {
      const detached = base(uid(), draft.date);
      detached.repeat = null;
      detached.skips = [];
      detached.doneDates = [];
      setRows((prev) =>
        sortEvents([
          ...prev.map((e) =>
            e.id === occ.seriesId
              ? { ...e, skips: withDate(e.skips ?? [], occ.dateKey), updatedAt: now, origin: deviceIdSync() }
              : e,
          ),
          detached,
        ]),
      );
      return detached;
    }

    if (occ) {
      const shift = daysBetween(occ.dateKey, draft.date);
      let saved: Syncable<AgendaEvent> | null = null;
      setRows((prev) =>
        sortEvents(
          prev.map((e) => {
            if (e.id !== occ.seriesId) return e;
            const anchor = shift === 0 ? e.date : toKey(addDays(new Date(`${e.date}T00:00:00`), shift));
            saved = { ...base(e.id, anchor), createdAt: e.createdAt, skips: e.skips, doneDates: e.doneDates };
            return saved;
          }),
        ),
      );
      return saved ?? base(occ.seriesId, draft.date);
    }

    const complete = base(draft.id ?? uid(), draft.date);
    setRows((prev) => {
      const idx = prev.findIndex((e) => e.id === complete.id);
      const next =
        idx >= 0 ? prev.map((e) => (e.id === complete.id ? complete : e)) : [...prev, complete];
      return sortEvents(next);
    });
    return complete;
  }, []);

  /*
    Supprimer, c'est poser une pierre tombale, pas retirer du tableau : une
    ligne effacée pour de bon ne pourrait pas se propager à l'autre appareil,
    qui ne la voyant plus la renverrait. Rien ne change à l'écran — la vue ne
    lit que `events`, d'où les pierres tombales sont absentes.
  */
  const remove = useCallback((id: string, scope: Scope = 'one') => {
    const now = Date.now();
    const occ = splitOccurrenceId(id);
    /*
      Retirer une seule occasion ne supprime rien : ça ajoute un jour à la
      liste des sauts de la mère. La série continue autour du trou.
    */
    if (occ && scope === 'one') {
      setRows((prev) =>
        prev.map((e) =>
          e.id === occ.seriesId
            ? { ...e, skips: withDate(e.skips ?? [], occ.dateKey), updatedAt: now, origin: deviceIdSync() }
            : e,
        ),
      );
      return;
    }
    const target = occ ? occ.seriesId : id;
    setRows((prev) =>
      prev.map((e) =>
        e.id === target ? { ...e, deletedAt: now, updatedAt: now, origin: deviceIdSync() } : e,
      ),
    );
  }, []);

  const toggleDone = useCallback((id: string) => {
    const now = Date.now();
    const occ = splitOccurrenceId(id);
    setRows((prev) =>
      prev.map((e) => {
        if (occ) {
          // une routine se coche jour par jour : un `done` unique cocherait toute la série
          if (e.id !== occ.seriesId) return e;
          return {
            ...e,
            doneDates: toggleDate(e.doneDates ?? [], occ.dateKey),
            updatedAt: now,
            origin: deviceIdSync(),
          };
        }
        return e.id === id ? { ...e, done: !e.done, updatedAt: now, origin: deviceIdSync() } : e;
      }),
    );
  }, []);

  const applyDefaultAlerts = useCallback((alerts: number[]) => {
    if (!alerts.length) return 0;
    const now = Date.now();
    const today = toKey(new Date());
    let touched = 0;
    setRows((prev) =>
      prev.map((e) => {
        // le passé n'a plus rien à rappeler ; une routine reste concernée
        // quelle que soit sa date d'ancrage, puisqu'elle continue
        const stillAhead = e.repeat ? true : e.date >= today;
        if (e.deletedAt != null || !stillAhead || (e.alerts?.length ?? 0) > 0) return e;
        touched++;
        return { ...e, alerts, updatedAt: now, origin: deviceIdSync() };
      }),
    );
    return touched;
  }, []);

  const mergeRemote = useCallback((remote: Syncable<AgendaEvent>[]) => {
    setRows((prev) => sortEvents(mergeById(prev, remote)));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready, events, rows, byDay, eventsOn, save, remove, toggleDone,
      applyDefaultAlerts, mergeRemote,
    }),
    [
      ready, events, rows, byDay, eventsOn, save, remove, toggleDone,
      applyDefaultAlerts, mergeRemote,
    ],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): Store {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents doit être utilisé dans <EventsProvider>');
  return ctx;
}
