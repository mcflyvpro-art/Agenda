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
};

export type Draft = Omit<AgendaEvent, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: number;
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
