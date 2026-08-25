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
import { alive, collectGarbage } from '../sync/merge';
import type { Syncable } from '../sync/types';
import type { Todo, TodoDraft } from '../types';

const STORAGE_KEY = 'agenda.todos.v2';
const SEED_KEY = 'agenda.todos.seeded.v2';

/** Quelques exemples au tout premier lancement, pour que la boîte ne soit pas vide. */
const SEED_ON_FIRST_LAUNCH = true;

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
};

const TodosContext = createContext<Store | null>(null);

function seed(): Syncable<Todo>[] {
  const now = Date.now();
  const mk = (title: string, i: number): Syncable<Todo> => ({
    id: uid(),
    title,
    notes: '',
    done: false,
    estimate: 60,
    createdAt: now - i * 1000,
    updatedAt: now - i * 1000,
    deletedAt: null,
    origin: deviceIdSync(),
  });
  return [
    mk('Réviser le DS de maths', 0),
    mk('Appeler le dentiste', 1),
    mk('Trier les photos de cet été', 2),
  ];
}

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

  useEffect(() => {
    (async () => {
      try {
        const [raw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEED_KEY),
        ]);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Syncable<Todo>>[];
          if (Array.isArray(parsed)) setRows(parsed.map(adopt));
        } else if (!seeded && SEED_ON_FIRST_LAUNCH) {
          setRows(seed());
          AsyncStorage.setItem(SEED_KEY, '1').catch(() => {});
        }
      } catch {
        // rien de lisible : on démarre à vide
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectGarbage(rows))).catch(() => {});
  }, [rows]);

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

  const value = useMemo<Store>(
    () => ({ todos, rows, pending, done, add, save, remove, toggleDone, clearDone }),
    [todos, rows, pending, done, add, save, remove, toggleDone, clearDone],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error('useTodos doit être utilisé dans <TodosProvider>');
  return ctx;
}
