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

export type ViewMode = 'month' | 'day';
