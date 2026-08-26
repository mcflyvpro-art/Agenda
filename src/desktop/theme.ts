import { theme } from '../theme';

/**
 * Les mesures et les matières propres au bureau.
 *
 * L'interface mobile est dessinée pour le pouce : de grandes cibles, des
 * coins très arrondis, beaucoup d'air. Au clavier et à la souris, les
 * mêmes valeurs paraissent énormes et vides — un écran de 27 pouces
 * n'afficherait qu'une poignée d'informations. Tout est donc resserré :
 * cibles à la taille du curseur, rayons plus sobres, et surtout beaucoup
 * plus de densité à l'écran.
 *
 * Deuxième différence, moins visible mais tout aussi structurante : sur
 * un ordinateur, la profondeur se raconte en lumière plutôt qu'en
 * couleur. D'où une pile d'ombres à plusieurs couches — une passe courte
 * qui décolle la surface de son fond, une passe longue et très diluée qui
 * lui donne du poids — au lieu du halo unique et flou qui suffit sur un
 * téléphone tenu à quarante centimètres.
 */

/**
 * Le mouvement, en un seul vocabulaire.
 *
 * Les durées sont volontairement plus courtes qu'en tactile : au curseur,
 * la réponse au survol doit précéder la conscience du geste, sinon
 * l'interface paraît molle. Rien ne dépasse un tiers de seconde, et les
 * courbes sont toutes en décélération — départ franc, arrivée posée.
 */
export const MOTION = {
  /** survol, changement d'état d'un bouton */
  fast: '130ms',
  /** la plupart des transitions : fond, ombre, position */
  base: '190ms',
  /** grandes surfaces : panneaux, apparitions */
  slow: '280ms',
  /** décélération façon iOS */
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** aller-retour symétrique */
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** léger dépassement, réservé aux apparitions ponctuelles */
  spring: 'cubic-bezier(0.34, 1.4, 0.5, 1)',
} as const;

/** Raccourci : une déclaration de transition prête à poser dans un style. */
export const transition = (
  props: string,
  duration: string = MOTION.base,
  ease: string = MOTION.out,
) =>
  ({
    transitionProperty: props,
    transitionDuration: duration,
    transitionTimingFunction: ease,
  }) as const;

export const dt = {
  sidebar: 244,
  inspector: 344,
  topbar: 58,
  /** hauteur d'une heure dans les grilles horaires du bureau */
  hour: 52,
  radius: { xs: 7, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  /** rayon des trois panneaux flottants, et écart qui les sépare */
  panelRadius: 16,
  frame: 10,
  gap: { xs: 4, sm: 8, md: 14, lg: 22, xl: 30 },

  /**
   * Fonds : quatre plans, du plus enfoncé au plus proche.
   *
   * L'ordre compte, et il est l'inverse de celui qu'on prend d'instinct.
   * La toile du fond — `canvas` — est le plan le plus sombre : c'est elle
   * qui court d'un bord à l'autre de la fenêtre, et c'est parce qu'elle
   * est plus sombre que tout le reste que les panneaux posés dessus ont
   * l'air de flotter. Vient ensuite la feuille de travail (`bg`), plus
   * claire, sur laquelle les vues s'installent ; puis les cartes
   * blanches, et enfin le blanc translucide des barres.
   *
   * Une toile plus claire que ses panneaux — le réflexe habituel —
   * annulerait tout l'effet : sans écart de valeur, un panneau ne flotte
   * pas, il se confond.
   */
  canvas: '#E7E5F0',
  canvasWash:
    'linear-gradient(160deg, #EDEBF5 0%, #E7E5F0 48%, #E2E1EE 100%)',
  bg: '#F4F3F9',
  panel: '#FFFFFF',
  /** le blanc des barres, assez translucide pour que la toile les teinte */
  veil: 'rgba(255,255,255,0.82)',
  veilBlur: 'saturate(180%) blur(24px)',
  sunken: '#F2F1F7',
  sunkenDeep: '#E9E8F1',

  line: theme.hairline,
  lineStrong: theme.hairlineStrong,
  ink: theme.ink,
  inkSoft: theme.inkSoft,
  inkFaint: theme.inkFaint,

  /** Réponse au survol et à la sélection, en surimpression. */
  hover: 'rgba(32,32,43,0.045)',
  hoverStrong: 'rgba(32,32,43,0.08)',

  /**
   * Élévations.
   *
   * Trois couches à chaque niveau : un liseré de contact presque opaque,
   * une ombre courte qui pose l'objet, une ombre longue très diluée qui
   * lui donne sa masse. C'est ce triplet — et non le flou seul — qui fait
   * la différence entre « une boîte avec une ombre » et une surface qui
   * flotte réellement au-dessus du fond.
   */
  shadow: {
    flat: { boxShadow: '0 1px 1px rgba(40,34,62,0.04)' },
    panel: {
      boxShadow:
        '0 0 0 0.5px rgba(40,34,62,0.05), 0 1px 2px rgba(40,34,62,0.05), 0 6px 16px -8px rgba(40,34,62,0.14)',
    },
    raised: {
      boxShadow:
        '0 0 0 0.5px rgba(40,34,62,0.06), 0 2px 5px rgba(40,34,62,0.07), 0 14px 30px -12px rgba(40,34,62,0.20)',
    },
    pop: {
      boxShadow:
        '0 0 0 0.5px rgba(30,24,48,0.07), 0 10px 22px -10px rgba(30,24,48,0.24), 0 38px 70px -28px rgba(30,24,48,0.40)',
    },
    /** les trois panneaux flottants : posés sur la toile, pas encastrés */
    float: {
      boxShadow:
        '0 0 0 0.5px rgba(40,34,62,0.06), 0 1px 3px rgba(40,34,62,0.06), 0 14px 32px -14px rgba(40,34,62,0.22)',
    },
  },

  /** L'anneau de sélection, posé autour d'une surface isolée. */
  ring: (color: string, width = 2) =>
    ({ boxShadow: `0 0 0 ${width}px ${color}` }) as const,

  /**
   * Le même anneau, mais tracé à l'intérieur du bord.
   *
   * C'est la version qu'il faut dès que la surface en touche une autre —
   * une case de calendrier, une pastille de date : un anneau extérieur
   * déborderait sur la voisine et ferait grossir la case d'un pixel et
   * demi, ce qui se voit immédiatement dans une grille.
   */
  ringIn: (color: string, width = 2) =>
    ({ boxShadow: `inset 0 0 0 ${width}px ${color}` }) as const,
} as const;

/** Les cinq échelles, dans l'ordre du plus large au plus serré. */
export const SCALE_ORDER = ['year', 'month', 'week', 'day'] as const;

/**
 * Une couleur en hexadécimal, additionnée d'une opacité.
 *
 * Les teintes du jeu de couleurs arrivent en `#RRGGBB` ; les poser en
 * fond demande presque toujours de les diluer. Concaténer deux chiffres
 * hexadécimaux marche, mais rend le code illisible (`${accent}1F`) et se
 * casse dès qu'une teinte arrive sous une autre forme.
 */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Un dégradé très court d'une teinte vers elle-même, pour les pastilles. */
export function sheen(hex: string, from = 0.22, to = 0.1): string {
  return `linear-gradient(160deg, ${alpha(hex, from)} 0%, ${alpha(hex, to)} 100%)`;
}
