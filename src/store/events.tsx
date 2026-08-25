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
import { deviceIdSync } from '../sync/device';
import { alive, collectGarbage, mergeById } from '../sync/merge';
import type { Syncable } from '../sync/types';
import type { AgendaEvent, Draft } from '../types';

// version bumpée : les anciens exemples de démonstration, déjà enregistrés
// dans le stockage des appareils existants, sont ainsi ignorés eux aussi —
// l'app démarre désormais toujours vierge
const STORAGE_KEY = 'agenda.events.v2';

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
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
