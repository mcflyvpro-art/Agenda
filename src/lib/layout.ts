import type { AgendaEvent } from '../types';

export type Positioned = {
  event: AgendaEvent;
  /** colonne occupée dans son groupe de chevauchement */
  col: number;
  cols: number;
  /** identifiant du groupe de chevauchement auquel il appartient */
  cluster: number;
};

/** Un paquet d'événements qui se chevauchent, du plus tôt au plus tard. */
export type Cluster = {
  id: number;
  events: AgendaEvent[];
  /** début du premier et fin du dernier, en minutes */
  start: number;
  end: number;
};

/**
 * Range les événements qui se chevauchent côte à côte,
 * façon calendrier : on découpe en grappes, puis en colonnes.
 *
 * Les grappes sont renvoyées à part : au-delà de deux colonnes les cartes
 * deviennent trop étroites pour se lire, et la timeline préfère alors
 * replier la grappe entière derrière une pastille qu'on ouvre.
 */
export function layoutDay(
  events: AgendaEvent[],
  minDuration = 20,
): { positioned: Positioned[]; clusters: Cluster[] } {
  const timed = events
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: Positioned[] = [];
  const clusters: Cluster[] = [];
  let cluster: AgendaEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const id = clusters.length;
    const columns: number[] = []; // fin de la dernière carte de chaque colonne
    const assigned: { event: AgendaEvent; col: number }[] = [];
    for (const e of cluster) {
      const span = Math.max(e.end, e.start + minDuration);
      let col = columns.findIndex((end) => end <= e.start);
      if (col === -1) {
        col = columns.length;
        columns.push(span);
      } else {
        columns[col] = span;
      }
      assigned.push({ event: e, col });
    }
    for (const a of assigned) out.push({ ...a, cols: columns.length, cluster: id });
    clusters.push({
      id,
      events: cluster,
      start: cluster[0].start,
      end: Math.max(...cluster.map((e) => Math.max(e.end, e.start + minDuration))),
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const e of timed) {
    const span = Math.max(e.end, e.start + minDuration);
    if (cluster.length && e.start >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, span);
  }
  flush();

  return { positioned: out, clusters };
}
