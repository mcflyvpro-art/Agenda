import type { AgendaEvent, Todo } from '../types';

/**
 * Ce qu'il faut ajouter à un objet pour qu'il puisse voyager.
 *
 * Trois champs, et chacun répond à une question qu'une synchronisation
 * pose forcément un jour :
 *
 *  — `updatedAt` : « qui a la version la plus récente ? ». C'est l'arbitre
 *    des conflits. Une horloge locale suffit tant qu'il n'y a qu'une seule
 *    personne : deux appareils à elle ne modifient presque jamais la même
 *    fiche à la même seconde, et quand ça arrive, le dernier écrit gagne.
 *
 *  — `deletedAt` : « et ce qui a été supprimé ? ». Un objet effacé pour de
 *    bon ne peut pas se propager : l'autre appareil, ne le voyant plus
 *    dans la liste, le renverrait gentiment. Une suppression doit donc
 *    rester visible sous forme de pierre tombale, et n'être purgée que
 *    bien après que tous les appareils l'ont vue.
 *
 *  — `origin` : « qui l'a écrit ? ». Sans ça, un appareil réapplique ses
 *    propres écritures qui lui reviennent du serveur, et l'interface
 *    sautille à chaque aller-retour.
 */
export type SyncMeta = {
  updatedAt: number;
  deletedAt: number | null;
  origin: string;
};

export type Syncable<T> = T & SyncMeta;

/** Les tables qui voyagent. Les réglages restent propres à chaque appareil. */
export type TableName = 'events' | 'todos';

export type RowOf<T extends TableName> = T extends 'events'
  ? Syncable<AgendaEvent>
  : Syncable<Todo>;

/** Une écriture en attente d'être poussée. */
export type Op = {
  table: TableName;
  id: string;
  /** l'objet complet, pierre tombale comprise — jamais un patch partiel */
  row: Syncable<AgendaEvent> | Syncable<Todo>;
  at: number;
};

export type PullResult = {
  events: Syncable<AgendaEvent>[];
  todos: Syncable<Todo>[];
  /** borne haute à repasser au prochain `pull` */
  cursor: number;
};

export type SyncStatus =
  | { state: 'local' }
  | { state: 'idle'; lastSync: number }
  | { state: 'syncing' }
  | { state: 'error'; message: string };

/**
 * Le contrat qu'un dos de synchronisation doit remplir.
 *
 * Volontairement minuscule, et volontairement sans rien de Supabase
 * dedans : le jour où on branche une base, on écrit une implémentation de
 * cette interface et rien d'autre ne bouge. L'application ne connaît que
 * ces quatre méthodes.
 */
export interface SyncAdapter {
  readonly kind: string;
  /** tout ce qui a changé depuis `cursor`, pierres tombales comprises */
  pull(cursor: number): Promise<PullResult>;
  /** pousse un lot d'écritures ; renvoie l'horodatage retenu par le serveur */
  push(ops: Op[]): Promise<{ cursor: number }>;
  /** notification temps réel, si le dos sait faire — sinon on interroge */
  subscribe?(onChange: () => void): () => void;
}
