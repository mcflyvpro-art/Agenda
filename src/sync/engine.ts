import { useEffect, useRef } from 'react';
import { useEvents } from '../store/events';
import { useTodos } from '../store/todos';
import { getAdapter } from './adapter';
import { deviceIdSync } from './device';
import type { Op } from './types';

const CURSOR_KEY = 'agenda.sync.cursor';
/** filet de sécurité si le serveur ne notifie rien : on repasse quand même de temps en temps */
const POLL_MS = 20_000;
/** attendre un peu avant de pousser : une fiche se modifie souvent en plusieurs frappes rapprochées */
const PUSH_DEBOUNCE_MS = 700;

function readCursor(): number {
  try {
    return Number(localStorage.getItem(CURSOR_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function writeCursor(v: number) {
  try {
    localStorage.setItem(CURSOR_KEY, String(v));
  } catch {
    /* stockage refusé : le prochain pull repartira de zéro, sans plus de dégâts */
  }
}

/**
 * Fait vivre la synchronisation, une fois connecté.
 *
 * Le principe tient en deux mouvements, volontairement simples plutôt
 * que soigneusement optimisés — à l'échelle d'un usage personnel
 * (quelques centaines de fiches), le coût d'un aller-retour complet est
 * négligeable, et la simplicité évite toute une classe de bugs de
 * synchronisation partielle :
 *
 *  — DESCENDRE : au démarrage, à chaque notification temps réel, et à
 *    défaut toutes les vingt secondes, on demande au serveur tout ce qui
 *    a changé depuis le dernier curseur connu, et on le fusionne dans le
 *    magasin local (`mergeById`, dernier écrit gagne).
 *
 *  — MONTER : à chaque modification locale, après un court silence, on
 *    pousse les fiches qui portent la marque de CET appareil. Ce filtre
 *    par `origin` est ce qui empêche la boucle : une fiche qui vient de
 *    descendre garde l'origine de l'appareil qui l'a écrite, jamais la
 *    nôtre, donc elle ne remonte pas aussitôt.
 */
export function useCloudSync(enabled: boolean) {
  const eventsStore = useEvents();
  const todosStore = useTodos();
  const mergeEvents = eventsStore.mergeRemote;
  const mergeTodos = todosStore.mergeRemote;

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    const pullAndMerge = async () => {
      try {
        const adapter = getAdapter();
        const cursor = readCursor();
        const res = await adapter.pull(cursor);
        if (stopped) return;
        if (res.events.length) mergeEvents(res.events);
        if (res.todos.length) mergeTodos(res.todos);
        if (res.cursor > cursor) writeCursor(res.cursor);
      } catch {
        // hors ligne ou base injoignable : on retentera au prochain cycle
      }
    };

    pullAndMerge();
    const unsubscribe = getAdapter().subscribe?.(() => pullAndMerge());
    const timer = setInterval(pullAndMerge, POLL_MS);
    return () => {
      stopped = true;
      unsubscribe?.();
      clearInterval(timer);
    };
  }, [enabled, mergeEvents, mergeTodos]);

  const eventRows = eventsStore.rows;
  const todoRows = todosStore.rows;

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(async () => {
      const me = deviceIdSync();
      const ops: Op[] = [
        ...eventRows
          .filter((r) => r.origin === me)
          .map((r) => ({ table: 'events' as const, id: r.id, row: r, at: r.updatedAt })),
        ...todoRows
          .filter((r) => r.origin === me)
          .map((r) => ({ table: 'todos' as const, id: r.id, row: r, at: r.updatedAt })),
      ];
      if (!ops.length) return;
      try {
        await getAdapter().push(ops);
      } catch {
        // le prochain changement local, ou le prochain pull, retentera
      }
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [enabled, eventRows, todoRows]);
}
