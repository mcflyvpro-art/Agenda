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
import { uid } from '../lib/id';
import { addDays, toKey } from '../lib/date';
import { deviceIdSync } from '../sync/device';
import { alive, collectGarbage, mergeById } from '../sync/merge';
import type { Syncable } from '../sync/types';
import type { AgendaEvent, Draft } from '../types';

const STORAGE_KEY = 'agenda.events.v1';
const SEED_KEY = 'agenda.seeded.v1';

/** Quelques événements d'exemple au tout premier lancement. Passer à false pour démarrer à vide. */
const SEED_ON_FIRST_LAUNCH = true;

type Store = {
  ready: boolean;
  events: AgendaEvent[];
  /** tout, pierres tombales comprises — c'est ce que la synchronisation pousse */
  rows: Syncable<AgendaEvent>[];
  byDay: Record<string, AgendaEvent[]>;
  eventsOn: (key: string) => AgendaEvent[];
  save: (draft: Draft) => AgendaEvent;
  remove: (id: string) => void;
  toggleDone: (id: string) => void;
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

function seed(): Syncable<AgendaEvent>[] {
  const t = new Date();
  const today = toKey(t);
  const tomorrow = toKey(addDays(t, 1));
  const later = toKey(addDays(t, 3));
  const now = Date.now();
  const mk = (e: Partial<AgendaEvent>, i: number): Syncable<AgendaEvent> => ({
    id: uid(),
    title: '',
    emoji: '✨',
    color: 'lavender',
    date: today,
    start: 9 * 60,
    end: 10 * 60,
    allDay: false,
    location: '',
    notes: '',
    done: false,
    createdAt: now + i,
    updatedAt: now + i,
    deletedAt: null,
    origin: deviceIdSync(),
    ...e,
  });
  return [
    mk({ title: 'Café & to-do', emoji: '☕️', color: 'peach', start: 8 * 60 + 30, end: 9 * 60 }, 0),
    mk({ title: 'Point équipe', emoji: '💼', color: 'sky', start: 10 * 60, end: 11 * 60, location: 'Visio' }, 1),
    mk({ title: 'Déjeuner avec Léa', emoji: '🍽️', color: 'blush', start: 12 * 60 + 30, end: 14 * 60 }, 2),
    mk({ title: 'Yoga', emoji: '🧘‍♀️', color: 'mint', start: 18 * 60 + 30, end: 19 * 60 + 30 }, 3),
    mk({ title: 'Rendez-vous dentiste', emoji: '🩺', color: 'sage', date: tomorrow, start: 11 * 60, end: 11 * 60 + 45 }, 4),
    mk({ title: 'Ciné', emoji: '🎬', color: 'lilac', date: tomorrow, start: 20 * 60, end: 22 * 60 + 15 }, 5),
    mk({ title: 'Week-end à la mer', emoji: '🌊', color: 'butter', date: later, allDay: true, start: 0, end: 1440 }, 6),
  ];
}

/** Complète une fiche enregistrée avant que la synchronisation n'existe. */
function adopt(e: Partial<Syncable<AgendaEvent>>): Syncable<AgendaEvent> {
  return {
    ...(e as AgendaEvent),
    updatedAt: e.updatedAt ?? e.createdAt ?? 0,
    deletedAt: e.deletedAt ?? null,
    origin: e.origin ?? '',
  };
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Syncable<AgendaEvent>[]>([]);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEED_KEY),
        ]);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Syncable<AgendaEvent>>[];
          if (Array.isArray(parsed)) setRows(sortEvents(parsed.map(adopt)));
        } else if (!seeded && SEED_ON_FIRST_LAUNCH) {
          setRows(sortEvents(seed()));
          AsyncStorage.setItem(SEED_KEY, '1').catch(() => {});
        }
      } catch {
        // premier lancement / storage illisible : on démarre à vide
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectGarbage(rows))).catch(() => {});
  }, [rows]);

  /* Ce que voit l'application : tout sauf ce qui a été supprimé. */
  const events = useMemo(() => alive(rows), [rows]);

  const byDay = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const e of events) (map[e.date] ??= []).push(e);
    for (const k of Object.keys(map)) map[k] = sortEvents(map[k]);
    return map;
  }, [events]);

  const eventsOn = useCallback((key: string) => byDay[key] ?? [], [byDay]);

  const save = useCallback((draft: Draft) => {
    const now = Date.now();
    const complete: Syncable<AgendaEvent> = {
      ...draft,
      title: draft.title.trim() || 'Sans titre',
      id: draft.id ?? uid(),
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      origin: deviceIdSync(),
    };
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
  const remove = useCallback((id: string) => {
    const now = Date.now();
    setRows((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, deletedAt: now, updatedAt: now, origin: deviceIdSync() } : e,
      ),
    );
  }, []);

  const toggleDone = useCallback((id: string) => {
    const now = Date.now();
    setRows((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, done: !e.done, updatedAt: now, origin: deviceIdSync() } : e,
      ),
    );
  }, []);

  const mergeRemote = useCallback((remote: Syncable<AgendaEvent>[]) => {
    setRows((prev) => sortEvents(mergeById(prev, remote)));
  }, []);

  const value = useMemo<Store>(
    () => ({ ready, events, rows, byDay, eventsOn, save, remove, toggleDone, mergeRemote }),
    [ready, events, rows, byDay, eventsOn, save, remove, toggleDone, mergeRemote],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): Store {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents doit être utilisé dans <EventsProvider>');
  return ctx;
}
