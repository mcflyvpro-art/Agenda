import {
  addDays,
  getISOWeek,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const DAY_MS = 86400000;

/** Initiales des jours, dans l'ordre voulu (semaine démarrant lundi ou dimanche). */
export function weekdayLabels(weekStart: 0 | 1 = 1): string[] {
  const base = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  return weekStart === 1 ? [...base.slice(1), base[0]] : base;
}

/** Vrai pour samedi et dimanche. */
export const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** Clé stable d'un jour : 'YYYY-MM-DD' (sans dérive de fuseau) */
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export const todayKey = () => toKey(new Date());

/** 42 cases (6 semaines) alignées sur le premier jour de semaine choisi */
export function monthMatrix(monthDate: Date, weekStart: 0 | 1 = 1): Date[] {
  const first = startOfWeek(startOfMonth(monthDate), { weekStartsOn: weekStart });
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** Les 7 jours de la semaine contenant `d` */
export function weekOf(d: Date, weekStart: 0 | 1 = 1): Date[] {
  const first = startOfWeek(d, { weekStartsOn: weekStart });
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const monthTitle = (d: Date) => cap(format(d, 'MMMM', { locale: fr }));
export const monthYearTitle = (d: Date) => cap(format(d, 'MMMM yyyy', { locale: fr }));
export const longDay = (d: Date) => cap(format(d, 'EEEE d MMMM', { locale: fr }));
export const shortDay = (d: Date) => cap(format(d, 'EEE', { locale: fr })).replace('.', '');
export const dayNumber = (d: Date) => format(d, 'd');
export const chipDay = (d: Date) => cap(format(d, 'EEE d MMM yyyy', { locale: fr })).replace(/\./g, '');

/** minutes depuis minuit → '09:05' */
export function hhmm(min: number): string {
  const safe = Number.isFinite(min) ? min : 0;
  const m = Math.max(0, Math.min(1440, Math.round(safe)));
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${`${h}`.padStart(2, '0')}:${`${mm}`.padStart(2, '0')}`;
}

/** '1 h 30' — durée lisible */
export function durationLabel(start: number, end: number): string {
  const total = Math.max(0, end - start);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${`${m}`.padStart(2, '0')}`;
}

export function relativeDayLabel(key: string): string {
  const diff = differenceInCalendarDays(fromKey(key), startOfToday());
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  return longDay(fromKey(key));
}

export function minutesNow(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/** arrondi au quart d'heure le plus proche */
export const roundToQuarter = (m: number) => Math.round(m / 15) * 15;

export {
  addDays,
  getISOWeek,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
};
