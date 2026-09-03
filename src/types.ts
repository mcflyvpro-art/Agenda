import type { Repeat } from './lib/repeat';
import type { ColorKey } from './theme';

export type AgendaEvent = {
  id: string;
  title: string;
  emoji: string;
  color: ColorKey;
  /** jour de l'événement, format 'YYYY-MM-DD' */
  date: string;
  /** minutes depuis minuit */
  start: number;
  end: number;
  allDay: boolean;
  location: string;
  notes: string;
  done: boolean;
  createdAt: number;
  /** la règle de répétition, ou `null` pour un événement qui n'arrive qu'une fois */
  repeat: Repeat | null;
  /** jours retirés de la série ('YYYY-MM-DD') */
  skips: string[];
  /** jours cochés de la série ('YYYY-MM-DD') — `done` ne sert que hors routine */
  doneDates: string[];
  /** rappels, en minutes avant le début (0 = à l'heure pile) */
  alerts: number[];
  /**
   * Posé sur une occurrence engendrée par une routine, jamais enregistré :
   * c'est ce qui permet de remonter à la fiche mère depuis ce qu'on voit.
   */
  seriesId?: string;
};

/**
 * Ce qu'on manipule avant enregistrement.
 *
 * Les champs de routine et de rappel sont facultatifs ici : un formulaire
 * qui ne s'en occupe pas (une idée qu'on place, une création rapide) reste
 * valide, et `save` posera les valeurs par défaut.
 */
export type Draft = Omit<
  AgendaEvent,
  'id' | 'createdAt' | 'repeat' | 'skips' | 'doneDates' | 'alerts' | 'seriesId'
> & {
  id?: string;
  createdAt?: number;
  repeat?: Repeat | null;
  skips?: string[];
  doneDates?: string[];
  alerts?: number[];
  seriesId?: string;
};

/**
 * Une idée jetée en vrac : pas de date, pas d'heure.
 * Elle attend dans la boîte jusqu'à ce qu'on décide de lui donner un créneau.
 */
export type Todo = {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  /** durée pressentie, en minutes — sert à pré-remplir le créneau */
  estimate: number;
  createdAt: number;
};

export type TodoDraft = Omit<Todo, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: number;
};
