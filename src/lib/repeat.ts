import { addDays, addMonths, fromKey, toKey } from './date';

/**
 * Les routines : un événement qui revient.
 *
 * Le choix de fond est de ne rien enregistrer d'autre que la règle. Une
 * routine « tous les mardis » reste UNE fiche en base, pas cinquante-deux
 * par an : les occurrences sont recalculées à l'affichage, ce qui rend une
 * modification de la série instantanée partout et évite de faire grossir
 * la synchronisation d'un facteur cinquante.
 *
 * Deux listes complètent la règle, et couvrent tout ce qu'on veut faire à
 * une occasion précise sans casser la série :
 *
 *  — `skips` : les dates retirées. C'est ce qu'écrit « supprimer cette
 *    fois-ci », et c'est aussi ce qui reste quand on détache une
 *    occurrence pour la modifier seule (la mère saute ce jour, une fiche
 *    normale prend sa place).
 *
 *  — `doneDates` : les dates cochées. Un `done` unique sur la mère
 *    marquerait toute la série d'un coup, ce qui n'a aucun sens pour une
 *    routine.
 */

export type Freq = 'day' | 'week' | 'month' | 'year';

export type Repeat = {
  freq: Freq;
  /** tous les N jours / semaines / mois / ans */
  interval: number;
  /** semaine : 0 = dimanche … 6 = samedi. Vide = le jour de la date de départ. */
  weekdays: number[];
  /** mois : « le 14 » (date) ou « le 2ᵉ mardi » (weekday) */
  monthly: 'date' | 'weekday';
  /** dernier jour possible, inclus — 'YYYY-MM-DD' */
  until: string | null;
  /** nombre total d'occurrences, la première comprise */
  count: number | null;
};

export const DEFAULT_REPEAT: Repeat = {
  freq: 'week',
  interval: 1,
  weekdays: [],
  monthly: 'date',
  until: null,
  count: null,
};

/** Le séparateur d'une occurrence : `<id de la mère>#<jour>`. */
const SEP = '#';

export const occurrenceId = (seriesId: string, dateKey: string) => `${seriesId}${SEP}${dateKey}`;

/** Décompose l'identifiant d'une occurrence, ou `null` si c'en est pas une. */
export function splitOccurrenceId(id: string): { seriesId: string; dateKey: string } | null {
  const i = id.indexOf(SEP);
  if (i < 0) return null;
  return { seriesId: id.slice(0, i), dateKey: id.slice(i + 1) };
}

/**
 * Garde-fous.
 *
 * Une routine sans fin est infinie par définition : quelque chose doit
 * l'arrêter. La fenêtre d'affichage s'en charge presque toujours, ces deux
 * bornes ne servent qu'aux cas dégénérés (« tous les jours pendant
 * quarante ans ») pour qu'une saisie absurde ne bloque jamais l'écran.
 */
const MAX_STEPS = 6000;
const MAX_KEPT = 1500;

/** Les dates candidates de la règle, dans l'ordre, à l'infini. */
function* candidates(start: Date, rep: Repeat): Generator<Date> {
  const step = Math.max(1, Math.round(rep.interval) || 1);

  if (rep.freq === 'day') {
    let d = start;
    while (true) {
      yield d;
      d = addDays(d, step);
    }
  }

  if (rep.freq === 'week') {
    const days = rep.weekdays.length
      ? [...new Set(rep.weekdays)].sort((a, b) => a - b)
      : [start.getDay()];
    // le dimanche sert de repère interne pour découper les semaines ; le
    // réglage « la semaine commence le… » ne concerne que l'affichage
    let weekStart = addDays(start, -start.getDay());
    let firstWeek = true;
    while (true) {
      for (const wd of days) {
        const d = addDays(weekStart, wd);
        // la première semaine ne remonte pas avant le jour de départ
        if (firstWeek && d.getTime() < start.getTime()) continue;
        yield d;
      }
      firstWeek = false;
      weekStart = addDays(weekStart, 7 * step);
    }
  }

  if (rep.freq === 'month') {
    const firstOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    if (rep.monthly === 'date') {
      const dom = start.getDate();
      for (let i = 0; ; i++) {
        const base = addMonths(firstOfMonth, i * step);
        const d = new Date(base.getFullYear(), base.getMonth(), dom);
        // « le 31 » n'existe pas partout : ces mois-là sont sautés, pas décalés
        if (d.getMonth() === base.getMonth()) yield d;
      }
    } else {
      const wd = start.getDay();
      const nth = Math.floor((start.getDate() - 1) / 7); // 0 = le premier
      for (let i = 0; ; i++) {
        const base = addMonths(firstOfMonth, i * step);
        const firstWd = new Date(base.getFullYear(), base.getMonth(), 1).getDay();
        const day = 1 + ((wd - firstWd + 7) % 7) + nth * 7;
        const d = new Date(base.getFullYear(), base.getMonth(), day);
        // un 5ᵉ mardi n'existe pas tous les mois : même règle, on saute
        if (d.getMonth() === base.getMonth()) yield d;
      }
    }
  }

  if (rep.freq === 'year') {
    const m = start.getMonth();
    const dom = start.getDate();
    for (let i = 0; ; i++) {
      const d = new Date(start.getFullYear() + i * step, m, dom);
      if (d.getMonth() === m) yield d; // 29 février : seulement les années bissextiles
    }
  }
}

/**
 * Les jours où la routine tombe, entre deux bornes incluses.
 *
 * `count` compte depuis le tout début de la série, pas depuis la fenêtre
 * demandée — sinon « 10 fois » afficherait dix occurrences par mois
 * consulté. Les dates retirées consomment quand même leur tour, comme le
 * veut la convention iCalendar : retirer une occurrence n'en rajoute pas
 * une à la fin.
 */
export function occurrenceKeys(
  startKey: string,
  rep: Repeat | null | undefined,
  fromK: string,
  toK: string,
): string[] {
  if (!rep) return startKey >= fromK && startKey <= toK ? [startKey] : [];

  const fromT = fromKey(fromK).getTime();
  const toT = fromKey(toK).getTime();
  const untilT = rep.until ? fromKey(rep.until).getTime() : Infinity;
  const maxCount = rep.count && rep.count > 0 ? rep.count : Infinity;

  const out: string[] = [];
  let seen = 0;
  let steps = 0;

  for (const d of candidates(fromKey(startKey), rep)) {
    if (++steps > MAX_STEPS) break;
    const t = d.getTime();
    if (t > untilT || seen >= maxCount) break;
    seen++;
    if (t > toT) break;
    if (t >= fromT) {
      out.push(toKey(d));
      if (out.length >= MAX_KEPT) break;
    }
  }
  return out;
}

/* --- ce qui s'écrit dans l'interface ------------------------------------ */

const WD_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WD_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const NTH = ['1er', '2e', '3e', '4e', '5e'];

/** « Toutes les 2 semaines, lun. et jeu. » — la règle en une ligne lisible. */
export function repeatLabel(rep: Repeat | null | undefined, startKey?: string): string {
  if (!rep) return 'Jamais';
  const n = Math.max(1, Math.round(rep.interval) || 1);
  const start = startKey ? fromKey(startKey) : null;
  let base: string;

  if (rep.freq === 'day') {
    base = n === 1 ? 'Tous les jours' : `Tous les ${n} jours`;
  } else if (rep.freq === 'week') {
    const days = rep.weekdays.length
      ? [...new Set(rep.weekdays)].sort((a, b) => a - b)
      : start
        ? [start.getDay()]
        : [];
    const list = days.map((d) => WD_SHORT[d]).join(', ');
    const every = n === 1 ? 'Toutes les semaines' : `Toutes les ${n} semaines`;
    base = list ? `${every}, ${list}` : every;
  } else if (rep.freq === 'month') {
    const every = n === 1 ? 'Tous les mois' : `Tous les ${n} mois`;
    if (!start) base = every;
    else if (rep.monthly === 'date') base = `${every}, le ${start.getDate()}`;
    else {
      const nth = NTH[Math.floor((start.getDate() - 1) / 7)] ?? '';
      base = `${every}, le ${nth} ${WD_LONG[start.getDay()]}`;
    }
  } else {
    base = n === 1 ? 'Tous les ans' : `Tous les ${n} ans`;
  }

  if (rep.count && rep.count > 0) return `${base} · ${rep.count} fois`;
  if (rep.until) {
    const d = fromKey(rep.until);
    return `${base} · jusqu'au ${d.getDate()}/${`${d.getMonth() + 1}`.padStart(2, '0')}/${d.getFullYear()}`;
  }
  return base;
}

/** « 10 min avant », « À l'heure », « 1 jour avant » — un rappel en clair. */
export function alertLabel(minutes: number): string {
  if (minutes <= 0) return "À l'heure";
  if (minutes < 60) return `${minutes} min avant`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} h avant`;
  }
  const d = Math.round(minutes / 1440);
  return d === 1 ? '1 jour avant' : `${d} jours avant`;
}
