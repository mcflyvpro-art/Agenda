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
import type { Todo, TodoDraft } from '../types';

const STORAGE_KEY = 'agenda.todos.v2';
const SEED_KEY = 'agenda.todos.seeded.v2';

/** Quelques exemples au tout premier lancement, pour que la boîte ne soit pas vide. */
const SEED_ON_FIRST_LAUNCH = true;

type Store = {
  todos: Todo[];
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

function seed(): Todo[] {
  const now = Date.now();
  const mk = (title: string, i: number): Todo => ({
    id: uid(),
    title,
    notes: '',
    done: false,
    estimate: 60,
    createdAt: now - i * 1000,
  });
  return [
    mk('Réviser le DS de maths', 0),
    mk('Appeler le dentiste', 1),
    mk('Trier les photos de cet été', 2),
  ];
}

export function TodosProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEED_KEY),
        ]);
        if (raw) {
          const parsed = JSON.parse(raw) as Todo[];
          if (Array.isArray(parsed)) setTodos(parsed);
        } else if (!seeded && SEED_ON_FIRST_LAUNCH) {
          setTodos(seed());
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch(() => {});
  }, [todos]);

  const save = useCallback((draft: TodoDraft) => {
    const complete: Todo = {
      ...draft,
      title: draft.title.trim() || 'Sans titre',
      id: draft.id ?? uid(),
      createdAt: draft.createdAt ?? Date.now(),
    };
    setTodos((prev) => {
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

  const remove = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const clearDone = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.done));
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
    () => ({ todos, pending, done, add, save, remove, toggleDone, clearDone }),
    [todos, pending, done, add, save, remove, toggleDone, clearDone],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error('useTodos doit être utilisé dans <TodosProvider>');
  return ctx;
}
