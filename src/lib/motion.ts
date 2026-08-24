import { Easing } from 'react-native-reanimated';

/**
 * Le vocabulaire de mouvement de l'app, en un seul endroit.
 *
 * Le parti pris : court, discret, jamais élastique. Une interface qui
 * répond au doigt sans se faire remarquer — on doit sentir que ça bouge,
 * pas regarder l'animation se dérouler. Rien ne dépasse un tiers de
 * seconde, et aucun ressort ne rebondit visiblement.
 */

/** Durées, en millisecondes. */
export const DUR = {
  /** retour d'appui, bascule d'un état binaire */
  instant: 110,
  /** la plupart des transitions : apparition, fondu, glissement court */
  quick: 180,
  /** grandes surfaces : feuilles, changement de page */
  smooth: 260,
} as const;

/** Décélération iOS : départ franc, arrivée posée. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
/** Aller-retour symétrique, pour ce qui part et revient. */
export const EASE = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Ressorts serrés : `damping` volontairement haut par rapport à
 * `stiffness`, pour arriver net sans osciller.
 */
export const SPRING = {
  /** panneaux et feuilles — masse un peu plus lourde, donc plus posée */
  panel: { damping: 32, stiffness: 300, mass: 0.9 },
  /** boutons et petites bascules — vif, très court */
  press: { damping: 26, stiffness: 460, mass: 0.5 },
  /** retour à la position de repos après un glissement */
  settle: { damping: 30, stiffness: 380, mass: 0.7 },
} as const;
