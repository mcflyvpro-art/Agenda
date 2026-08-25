import type { Op, PullResult, SyncAdapter } from './types';

/**
 * Le dos par défaut : aucun.
 *
 * Tant qu'aucune base n'est branchée, l'application tourne exactement comme
 * avant — tout est local. Cet adaptateur n'est pas un bouchon de test :
 * c'est le mode de fonctionnement normal aujourd'hui, et il restera le
 * repli quand le réseau manquera.
 */
export const localOnly: SyncAdapter = {
  kind: 'local',
  async pull(): Promise<PullResult> {
    return { events: [], todos: [], cursor: 0 };
  },
  async push(_ops: Op[]) {
    return { cursor: 0 };
  },
};

/**
 * Le dos actif. Un seul point à changer le jour où la base arrive :
 *
 *   import { supabaseAdapter } from './supabase';
 *   setAdapter(supabaseAdapter({ url, anonKey }));
 *
 * Voir `src/sync/README.md` pour le schéma SQL et la marche à suivre.
 */
let current: SyncAdapter = localOnly;

export function setAdapter(next: SyncAdapter) {
  current = next;
}

export function getAdapter(): SyncAdapter {
  return current;
}
