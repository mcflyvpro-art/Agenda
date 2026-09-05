/**
 * L'envoi des rappels.
 *
 * Cette fonction tourne côté serveur, appelée toutes les minutes par
 * `pg_cron`. C'est ce qui permet à une notification d'arriver alors que
 * l'application est fermée, le téléphone dans une poche — un rappel calculé
 * dans le navigateur ne partirait que si le navigateur tournait, ce qui
 * n'est jamais vrai au moment où on en a besoin.
 *
 * Trois garanties tiennent la promesse « ça ne rate jamais » :
 *
 *  — chaque envoi est réservé dans `notify_log` AVANT de partir, sur une
 *    clé (compte, fiche, jour, rappel). Deux tours qui se chevauchent ne
 *    peuvent donc pas envoyer deux fois la même chose ;
 *
 *  — chaque tour regarde dix minutes en arrière, pas seulement la minute
 *    écoulée. Un tour manqué (redémarrage, base occupée) est rattrapé au
 *    suivant au lieu d'être perdu ;
 *
 *  — un échec réseau libère la réservation, pour que le tour suivant
 *    reprenne l'envoi au lieu de le considérer comme fait.
 *
 * Et le cloisonnement des comptes est structurel : un rappel est calculé
 * depuis les fiches d'UN compte, puis envoyé aux seuls appareils inscrits
 * sous CE compte. Un Mac connecté ailleurs est une autre ligne, avec un
 * autre destinataire — il ne peut rien recevoir de celui-ci.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const enc = new TextEncoder();

/** Combien de temps on regarde en arrière pour rattraper un tour manqué. */
const LOOKBACK_MS = 10 * 60 * 1000;
/** Le plus long préavis proposé dans l'application (une semaine). */
const MAX_LEAD_DAYS = 9;
/** Repère à part, dans le journal, pour la notification d'un jour entier. */
const ALL_DAY_MARK = -1;

/* --- petits outils binaires --------------------------------------------- */

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function bytesToB64url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

/* --- chiffrement du message (RFC 8291, aes128gcm) ------------------------ */

async function encryptPayload(payload: string, p256dh: string, authSecretB64: string) {
  const uaPublic = b64urlToBytes(p256dh); // 65 octets, point non compressé
  const authSecret = b64urlToBytes(authSecretB64); // 16 octets

  const eph = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256),
  );

  // le secret partagé devient la clé de chiffrement, en passant par HKDF
  const prkKey = await hmac(authSecret, shared);
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, Uint8Array.of(1));
  const ikm = await hmac(prkKey, keyInfo);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (
    await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), Uint8Array.of(1)))
  ).slice(0, 16);
  const nonce = (
    await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), Uint8Array.of(1)))
  ).slice(0, 12);

  // 0x02 marque la fin du contenu utile (il n'y a pas de remplissage ici)
  const plain = concat(enc.encode(payload), Uint8Array.of(2));
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, Uint8Array.of(asPublic.length), asPublic, cipher);
}

/* --- signature VAPID (RFC 8292) ------------------------------------------ */

async function vapidAuth(endpoint: string, publicKey: string, privateKey: string, subject: string) {
  const jwtHeader = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const jwtBody = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  );
  const signingInput = `${jwtHeader}.${jwtBody}`;

  const pub = b64urlToBytes(publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: privateKey,
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  // WebCrypto signe en r||s brut : c'est exactement ce qu'attend ES256
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput)),
  );
  return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${publicKey}`;
}

type Device = { endpoint: string; p256dh: string; auth: string };

async function sendPush(
  device: Device,
  payload: string,
  cfg: { public_key: string; private_key: string; subject: string },
): Promise<number> {
  const body = await encryptPayload(payload, device.p256dh, device.auth);
  const res = await fetch(device.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(device.endpoint, cfg.public_key, cfg.private_key, cfg.subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body,
  });
  return res.status;
}

/* --- fuseaux -------------------------------------------------------------- */

/** L'écart entre l'heure d'un fuseau et UTC, à cet instant précis. */
function tzOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  return asUtc - at.getTime();
}

/**
 * « Le 3 septembre à 18:00, heure de Paris » → l'instant réel.
 *
 * On devine, on regarde de combien on s'est trompé, on corrige. La seconde
 * passe n'est là que pour les nuits de changement d'heure, où l'écart lu
 * avant correction n'est pas celui qui s'applique après.
 */
function localToInstant(dateKey: string, minutes: number, tz: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const off1 = tzOffsetMs(new Date(guess), tz);
  const t1 = guess - off1;
  const off2 = tzOffsetMs(new Date(t1), tz);
  return off2 === off1 ? t1 : guess - off2;
}

/** Le jour qu'il est, dans ce fuseau, sous la forme 'YYYY-MM-DD'. */
function localDateKey(at: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  return parts; // en-CA donne déjà 'AAAA-MM-JJ'
}

const shiftKey = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
};

/* --- routines ------------------------------------------------------------- */
/* Miroir de `src/lib/repeat.ts` côté client : même règle, mêmes résultats.
   La logique est recopiée plutôt qu'importée parce qu'une fonction Deno ne
   partage pas le paquet de l'application ; toute correction ici doit être
   reportée là-bas, et inversement. */

type Repeat = {
  freq: 'day' | 'week' | 'month' | 'year';
  interval: number;
  weekdays: number[];
  monthly: 'date' | 'weekday';
  until: string | null;
  count: number | null;
};

const MAX_STEPS = 20000;

function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${`${d.getUTCDate()}`.padStart(2, '0')}`;
}

/** Les jours d'une routine entre deux bornes, calculés en UTC nu (aucune heure en jeu). */
function occurrenceKeys(startKey: string, rep: Repeat | null, fromK: string, toK: string): string[] {
  if (!rep) return startKey >= fromK && startKey <= toK ? [startKey] : [];

  const [sy, sm, sd] = startKey.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const step = Math.max(1, Math.round(rep.interval) || 1);
  const out: string[] = [];
  let seen = 0;
  let steps = 0;

  const consider = (d: Date): boolean => {
    const k = keyOf(d);
    if (rep.until && k > rep.until) return false;
    if (rep.count && rep.count > 0 && seen >= rep.count) return false;
    seen++;
    if (k > toK) return false;
    if (k >= fromK) out.push(k);
    return true;
  };

  if (rep.freq === 'day') {
    const d = new Date(start);
    while (steps++ < MAX_STEPS) {
      if (!consider(d)) break;
      d.setUTCDate(d.getUTCDate() + step);
    }
  } else if (rep.freq === 'week') {
    const days = rep.weekdays.length
      ? [...new Set(rep.weekdays)].sort((a, b) => a - b)
      : [start.getUTCDay()];
    const weekStart = new Date(start);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    let firstWeek = true;
    outer: while (steps++ < MAX_STEPS) {
      for (const wd of days) {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + wd);
        if (firstWeek && d.getTime() < start.getTime()) continue;
        if (!consider(d)) break outer;
      }
      firstWeek = false;
      weekStart.setUTCDate(weekStart.getUTCDate() + 7 * step);
    }
  } else if (rep.freq === 'month') {
    const dom = start.getUTCDate();
    const wd = start.getUTCDay();
    const nth = Math.floor((dom - 1) / 7);
    for (let i = 0; steps++ < MAX_STEPS; i++) {
      const base = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i * step, 1));
      let d: Date;
      if (rep.monthly === 'date') {
        d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), dom));
      } else {
        const firstWd = base.getUTCDay();
        d = new Date(
          Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1 + ((wd - firstWd + 7) % 7) + nth * 7),
        );
      }
      // un 31 (ou un 5ᵉ mardi) qui n'existe pas ce mois-là est sauté, pas décalé
      if (d.getUTCMonth() !== base.getUTCMonth()) continue;
      if (!consider(d)) break;
    }
  } else {
    const m = start.getUTCMonth();
    const dom = start.getUTCDate();
    for (let i = 0; steps++ < MAX_STEPS; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear() + i * step, m, dom));
      if (d.getUTCMonth() !== m) continue; // 29 février
      if (!consider(d)) break;
    }
  }
  return out;
}

/* --- le tour de garde ----------------------------------------------------- */

type Prefs = {
  user_id: string;
  enabled: boolean;
  default_alerts: number[];
  all_day_lead: number;
  all_day_time: number;
  quiet_enabled: boolean;
  quiet_from: number;
  quiet_to: number;
  tz: string;
};

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  date: string;
  start_min: number;
  end_min: number;
  all_day: boolean;
  location: string;
  done: boolean;
  repeat: Repeat | null;
  skips: string[];
  done_dates: string[];
  alerts: number[];
};

/** Vrai si cet instant tombe dans les heures silencieuses du compte. */
function isQuiet(at: number, p: Prefs): boolean {
  if (!p.quiet_enabled) return false;
  const off = tzOffsetMs(new Date(at), p.tz);
  const local = new Date(at + off);
  const min = local.getUTCHours() * 60 + local.getUTCMinutes();
  // un créneau qui passe minuit (22:00 → 07:00) se lit dans l'autre sens
  return p.quiet_from <= p.quiet_to
    ? min >= p.quiet_from && min < p.quiet_to
    : min >= p.quiet_from || min < p.quiet_to;
}

const hhmm = (m: number) =>
  `${`${Math.floor(m / 60)}`.padStart(2, '0')}:${`${m % 60}`.padStart(2, '0')}`;

type Due = { event: EventRow; occurrence: string; alert: number; at: number };

/** Tout ce qui aurait dû partir depuis `since`, pour ce compte. */
function dueFor(events: EventRow[], p: Prefs, since: number, now: number): Due[] {
  const today = localDateKey(new Date(now), p.tz);
  const fromK = shiftKey(today, -2);
  const toK = shiftKey(today, MAX_LEAD_DAYS);
  const out: Due[] = [];

  for (const e of events) {
    const alerts = Array.isArray(e.alerts) ? e.alerts : [];
    if (!alerts.length) continue;
    const skipped = new Set(e.skips ?? []);
    const done = new Set(e.done_dates ?? []);

    // rien à rappeler pour ce qui est déjà coché : une fiche unique porte
    // son état sur elle, une routine le porte jour par jour
    if (!e.repeat && e.done) continue;

    for (const key of occurrenceKeys(e.date, e.repeat, fromK, toK)) {
      if (skipped.has(key)) continue;
      if (done.has(key)) continue;

      if (e.all_day) {
        /* Un jour entier n'a pas d'heure : c'est le réglage du compte qui
           lui en donne une — la veille à 20:00 par défaut. Les préavis en
           minutes n'auraient aucun sens ici, on n'en garde qu'un seul. */
        const fireKey = shiftKey(key, -Math.max(0, p.all_day_lead));
        const at = localToInstant(fireKey, p.all_day_time, p.tz);
        if (at > since && at <= now) out.push({ event: e, occurrence: key, alert: ALL_DAY_MARK, at });
        continue;
      }

      for (const lead of alerts) {
        const at = localToInstant(key, e.start_min, p.tz) - Math.max(0, lead) * 60000;
        if (at > since && at <= now) out.push({ event: e, occurrence: key, alert: lead, at });
      }
    }
  }
  return out;
}

function bodyFor(e: EventRow, occurrence: string, alert: number): string {
  const bits: string[] = [];
  if (e.all_day) bits.push('Toute la journée');
  else bits.push(`${hhmm(e.start_min)} – ${hhmm(e.end_min)}`);
  if (alert > 0) bits.push(alert >= 1440 ? `dans ${Math.round(alert / 1440)} j` : `dans ${alert} min`);
  else if (alert === 0) bits.push("c'est maintenant");
  if (e.location) bits.push(e.location);
  return bits.join(' · ');
}

/*
  Sans ces en-têtes, le navigateur refuse de LIRE la réponse — alors même
  que la requête a bien été traitée et que la notification est partie.
  L'application concluait donc « serveur injoignable » au moment précis où
  le serveur venait de faire son travail. Un mensonge coûteux : il donnait
  à croire que rien ne marchait.
*/
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-agenda-key, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  // la requête préalable que le navigateur envoie avant le vrai appel
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: cfg } = await db.from('push_config').select('*').eq('id', 1).single();
  if (!cfg) return json({ ok: false, reason: 'pas de clés VAPID' }, 500);

  /*
    Deux façons d'entrer, et une seule qui déclenche le tour complet.

    La minuterie présente une clé propre à ce déclenchement, rangée dans
    la même table verrouillée que les clés VAPID. On préfère ça à la clé
    de service : si elle fuitait, elle ne permettrait que de provoquer un
    tour d'envoi — pas de lire la base.

    L'application, elle, appelle avec le jeton de la personne connectée
    pour un envoi d'essai — et cet appel-là ne peut toucher que SES
    appareils, jamais ceux d'un autre compte.
  */
  const cronKey = (cfg as { cron_key?: string | null }).cron_key ?? '';
  const isCron = !!cronKey && req.headers.get('x-agenda-key') === cronKey;

  let testUser: string | null = null;
  if (!isCron) {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data } = await db.auth.getUser(token);
    if (!data?.user) return json({ ok: false, reason: 'non autorisé' }, 401);
    testUser = data.user.id;
  }

  const now = Date.now();
  const since = now - LOOKBACK_MS;

  const send = async (device: Device, payload: string) => {
    let status = 0;
    try {
      status = await sendPush(device, payload, cfg);
    } catch {
      status = 0;
    }
    // 404 / 410 : l'abonnement n'existe plus (app désinstallée, cache vidé)
    if (status === 404 || status === 410) {
      await db.from('push_devices').delete().eq('endpoint', device.endpoint);
    }
    return status;
  };

  /* --- envoi d'essai, demandé depuis l'application --- */
  if (testUser) {
    const { data: devices } = await db
      .from('push_devices')
      .select('endpoint, p256dh, auth')
      .eq('user_id', testUser);
    if (!devices?.length) return json({ ok: false, reason: 'aucun appareil inscrit' });
    const payload = JSON.stringify({
      title: '🔔 Agenda',
      body: 'Les notifications fonctionnent sur cet appareil.',
      tag: `test-${now}`,
    });
    const codes = await Promise.all(devices.map((d) => send(d as Device, payload)));
    return json({ ok: codes.some((c) => c >= 200 && c < 300), devices: codes.length, codes });
  }

  /* --- le tour de garde complet --- */
  const { data: prefsRows } = await db.from('notify_prefs').select('*').eq('enabled', true);
  const { data: eventRows } = await db
    .from('events')
    .select(
      'id, user_id, title, emoji, date, start_min, end_min, all_day, location, done, repeat, skips, done_dates, alerts',
    )
    .is('deleted_at', null);

  const byUser = new Map<string, EventRow[]>();
  for (const e of (eventRows ?? []) as EventRow[]) {
    const list = byUser.get(e.user_id);
    if (list) list.push(e);
    else byUser.set(e.user_id, [e]);
  }

  let sent = 0;
  let skipped = 0;

  for (const p of (prefsRows ?? []) as Prefs[]) {
    const mine = byUser.get(p.user_id);
    if (!mine?.length) continue;

    const due = dueFor(mine, p, since, now);
    if (!due.length) continue;

    const { data: devices } = await db
      .from('push_devices')
      .select('endpoint, p256dh, auth')
      .eq('user_id', p.user_id);
    if (!devices?.length) continue;

    for (const d of due) {
      // la réservation part avant l'envoi : c'est elle qui interdit le doublon
      const claim = await db.from('notify_log').insert({
        user_id: p.user_id,
        event_id: d.event.id,
        occurrence: d.occurrence,
        alert_min: d.alert,
      });
      if (claim.error) continue; // déjà envoyé par un tour précédent

      // heures silencieuses : la réservation reste posée, rien ne part —
      // un rappel tu n'est pas un rappel en retard
      if (isQuiet(d.at, p)) {
        skipped++;
        continue;
      }

      const payload = JSON.stringify({
        title: `${d.event.emoji ?? ''} ${d.event.title}`.trim(),
        body: bodyFor(d.event, d.occurrence, d.alert),
        tag: `${d.event.id}#${d.occurrence}`,
        date: d.occurrence,
      });

      const codes: number[] = [];
      for (const dev of devices) codes.push(await send(dev as Device, payload));

      const delivered = codes.some((c) => c >= 200 && c < 300);
      if (delivered) {
        sent++;
      } else if (codes.some((c) => c === 0 || c >= 500)) {
        /*
          Rien n'est passé et au moins un refus ressemble à une panne
          passagère : on rend la réservation pour que le tour suivant
          reprenne l'envoi. On ne la rend que si RIEN n'a abouti — sinon
          le rattrapage sonnerait une seconde fois sur l'appareil qui,
          lui, avait bien reçu.
        */
        await db.from('notify_log').delete().match({
          user_id: p.user_id,
          event_id: d.event.id,
          occurrence: d.occurrence,
          alert_min: d.alert,
        });
      }
    }
  }

  return json({ ok: true, sent, skipped, at: new Date(now).toISOString() });
});
