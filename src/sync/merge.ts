import type { Syncable } from './types';

/**
 * Fusionne deux versions d'une même liste : la locale et celle du serveur.
 *
 * La règle est « le dernier qui écrit gagne », appliquée fiche par fiche
 * et non liste par liste — deux appareils qui touchent deux événements
 * différents gardent donc les deux modifications, ce qu'une fusion
 * grossière au niveau de la liste perdrait.
 *
 * Une suppression n'est pas un cas à part : une pierre tombale est une
 * version comme une autre, simplement plus récente. Elle gagne contre une
 * modification antérieure et perd contre une modification postérieure —
 * ce qui est exactement le comportement voulu quand on efface sur un
 * appareil puis qu'on corrige la même fiche sur l'autre.
 */
export function mergeById<T extends { id: string }>(
  local: Syncable<T>[],
  remote: Syncable<T>[],
): Syncable<T>[] {
  const byId = new Map<string, Syncable<T>>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const mine = byId.get(row.id);
    if (!mine || row.updatedAt > mine.updatedAt) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** Ce qui doit rester affiché : tout sauf les pierres tombales. */
export function alive<T extends { id: string }>(rows: Syncable<T>[]): T[] {
  return rows.filter((r) => r.deletedAt == null);
}

/** Délai après lequel une pierre tombale peut disparaître pour de bon. */
export const TOMBSTONE_TTL = 1000 * 60 * 60 * 24 * 60; // 60 jours

/** Purge les suppressions assez vieilles pour que tout le monde les ait vues. */
export function collectGarbage<T extends { id: string }>(
  rows: Syncable<T>[],
  now = Date.now(),
): Syncable<T>[] {
  return rows.filter((r) => r.deletedAt == null || now - r.deletedAt < TOMBSTONE_TTL);
}
