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
import { useAuthSession } from '../sync/auth';
import { deviceIdSync } from '../sync/device';
import { alive, collectGarbage, mergeById } from '../sync/merge';
import type { Syncable } from '../sync/types';
import type { Todo, TodoDraft } from '../types';

// version bumpée : les anciens exemples de démonstration, déjà enregistrés
// dans le stockage des appareils existants, sont ainsi ignorés eux aussi —
// l'app démarre désormais toujours vierge
const BASE_KEY = 'agenda.todos.v3';

/** Voir le commentaire jumeau dans `events.tsx` : un tiroir par compte. */
function storageKeyFor(userId: string | null): string {
  return userId ? `${BASE_KEY}.${userId}` : BASE_KEY;
}

type Store = {
  todos: Todo[];
  /** tout, pierres tombales comprises — c'est ce que la synchronisation pousse */
  rows: Syncable<Todo>[];
  /** celles qui restent à faire, les plus récentes en premier */
  pending: Todo[];
  done: Todo[];
  add: (title: string, patch?: Partial<TodoDraft>) => Todo;
  save: (draft: TodoDraft) => Todo;
  remove: (id: string) => void;
  toggleDone: (id: string) => void;
  clearDone: () => void;
  /** fusionne des lignes venues du serveur ; « dernier écrit gagne », fiche par fiche */
  mergeRemote: (rows: Syncable<Todo>[]) => void;
};

const TodosContext = createContext<Store | null>(null);

/** Complète une idée enregistrée avant que la synchronisation n'existe. */
function adopt(t: Partial<Syncable<Todo>>): Syncable<Todo> {
  return {
    ...(t as Todo),
    updatedAt: t.updatedAt ?? t.createdAt ?? 0,
    deletedAt: t.deletedAt ?? null,
    origin: t.origin ?? '',
  };
}

export function TodosProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Syncable<Todo>[]>([]);
  const hydrated = useRef(false);

  const session = useAuthSession();
  const storageKey = storageKeyFor(session?.user?.id ?? null);

  useEffect(() => {
    if (session === undefined) return;
    hydrated.current = false;
    setRows([]); // jamais laisser voir, même une frame, le cache du compte précédent
    (async () => {
      try {
        // voir le commentaire jumeau dans events.tsx : pas de reprise
        // automatique du tiroir anonyme, pour ne jamais mélanger deux comptes
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Syncable<Todo>>[];
          if (Array.isArray(parsed)) setRows(parsed.map(adopt));
        }
      } catch {
        // rien de lisible : on démarre à vide
      } finally {
        hydrated.current = true;
      }
    })();
  }, [storageKey, session]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(collectGarbage(rows))).catch(() => {});
  }, [rows, storageKey]);

  /* Ce que voit l'application : tout sauf ce qui a été supprimé. */
  const todos = useMemo(() => alive(rows), [rows]);

  const save = useCallback((draft: TodoDraft) => {
    const now = Date.now();
    const complete: Syncable<Todo> = {
      ...draft,
      title: draft.title.trim() || 'Sans titre',
      id: draft.id ?? uid(),
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      origin: deviceIdSync(),
    };
    setRows((prev) => {
      const idx = prev.findIndex((t) => t.id === complete.id);
      return idx >= 0 ? prev.map((t) => (t.id === complete.id ? complete : t)) : [complete, ...prev];
    });
    return complete;
  }, []);

  const add = useCallback(
    (title: string, patch: Partial<TodoDraft> = {}) =>
      save({ title, notes: '', done: false, estimate: 60, ...patch }),
    [save],
  );

  /* Comme pour les événements : une suppression est une pierre tombale. */
  const remove = useCallback((id: string) => {
    const now = Date.now();
    setRows((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, deletedAt: now, updatedAt: now, origin: deviceIdSync() } : t,
      ),
    );
  }, []);

  const toggleDone = useCallback((id: string) => {
    const now = Date.now();
    setRows((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, updatedAt: now, origin: deviceIdSync() } : t,
      ),
    );
  }, []);

  const clearDone = useCallback(() => {
    const now = Date.now();
    setRows((prev) =>
      prev.map((t) =>
        t.done && t.deletedAt == null
          ? { ...t, deletedAt: now, updatedAt: now, origin: deviceIdSync() }
          : t,
      ),
    );
  }, []);

  const pending = useMemo(
    () => todos.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt),
    [todos],
  );
  const done = useMemo(
    () => todos.filter((t) => t.done).sort((a, b) => b.createdAt - a.createdAt),
    [todos],
  );

  const mergeRemote = useCallback((remote: Syncable<Todo>[]) => {
    setRows((prev) => mergeById(prev, remote));
  }, []);

  const value = useMemo<Store>(
    () => ({ todos, rows, pending, done, add, save, remove, toggleDone, clearDone, mergeRemote }),
    [todos, rows, pending, done, add, save, remove, toggleDone, clearDone, mergeRemote],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error('useTodos doit être utilisé dans <TodosProvider>');
  return ctx;
}
