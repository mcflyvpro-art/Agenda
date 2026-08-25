import type { AgendaEvent, Todo } from '../types';
import { supabase } from './supabaseClient';
import type { Op, PullResult, SyncAdapter, Syncable } from './types';

/*
 * Les tables parlent `snake_case` (convention SQL), les magasins de l'app
 * parlent `camelCase` (convention JS/TS) — ces quatre fonctions ne font
 * que la traversée entre les deux, dans un sens puis dans l'autre.
 */

function rowToEvent(r: any): Syncable<AgendaEvent> {
  return {
    id: r.id,
    title: r.title,
    emoji: r.emoji,
    color: r.color,
    date: r.date,
    start: r.start_min,
    end: r.end_min,
    allDay: r.all_day,
    location: r.location,
    notes: r.notes,
    done: r.done,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deletedAt: r.deleted_at == null ? null : Number(r.deleted_at),
    origin: r.origin ?? '',
  };
}

function eventToRow(e: Syncable<AgendaEvent>) {
  return {
    id: e.id,
    title: e.title,
    emoji: e.emoji,
    color: e.color,
    date: e.date,
    start_min: e.start,
    end_min: e.end,
    all_day: e.allDay,
    location: e.location,
    notes: e.notes,
    done: e.done,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt,
    origin: e.origin,
  };
}

function rowToTodo(r: any): Syncable<Todo> {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    done: r.done,
    estimate: r.estimate,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deletedAt: r.deleted_at == null ? null : Number(r.deleted_at),
    origin: r.origin ?? '',
  };
}

function todoToRow(t: Syncable<Todo>) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    done: t.done,
    estimate: t.estimate,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt,
    origin: t.origin,
  };
}

/**
 * Le dos Supabase : un `pull` filtré par date, un `push` en `upsert`, un
 * `subscribe` sur le canal temps réel de Postgres.
 *
 * Une suppression n'existe pas ici — voir `merge.ts` : elle arrive comme
 * une ligne `upsert`ée avec `deleted_at` rempli, exactement comme
 * n'importe quelle autre modification. Rien de spécifique à écrire pour
 * elle, ni ici ni côté base.
 */
export const supabaseAdapter: SyncAdapter = {
  kind: 'supabase',

  async pull(cursor): Promise<PullResult> {
    const [ev, td] = await Promise.all([
      supabase.from('events').select('*').gt('updated_at', cursor),
      supabase.from('todos').select('*').gt('updated_at', cursor),
    ]);
    if (ev.error) throw ev.error;
    if (td.error) throw td.error;

    const events = (ev.data ?? []).map(rowToEvent);
    const todos = (td.data ?? []).map(rowToTodo);
    const newest = [...events, ...todos].reduce((m, r) => Math.max(m, r.updatedAt), cursor);
    return { events, todos, cursor: newest };
  },

  async push(ops: Op[]) {
    const events = ops.filter((o) => o.table === 'events').map((o) => eventToRow(o.row as Syncable<AgendaEvent>));
    const todos = ops.filter((o) => o.table === 'todos').map((o) => todoToRow(o.row as Syncable<Todo>));

    if (events.length) {
      const { error } = await supabase.from('events').upsert(events);
      if (error) throw error;
    }
    if (todos.length) {
      const { error } = await supabase.from('todos').upsert(todos);
      if (error) throw error;
    }
    return { cursor: Date.now() };
  },

  subscribe(onChange) {
    const channel = supabase
      .channel('agenda-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
