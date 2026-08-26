/**
 * La majuscule de début de phrase, et elle seule.
 *
 * `text-transform: capitalize` du CSS met une capitale à chaque mot, ce
 * qui donne « Vendredi 28 Août » : correct en anglais, faux en français,
 * où les noms de mois et de jours restent en bas de casse. Les libellés
 * de dates arrivent entièrement en minuscules et n'ont besoin que d'une
 * seule capitale, la première.
 */
export function firstUpper(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
