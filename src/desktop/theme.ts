import { theme } from '../theme';

/**
 * Les mesures propres au bureau.
 *
 * L'interface mobile est dessinée pour le pouce : de grandes cibles, des
 * coins très arrondis, beaucoup d'air. Au clavier et à la souris, les
 * mêmes valeurs paraissent énormes et vides — un écran de 27 pouces
 * n'afficherait qu'une poignée d'informations. Tout est donc resserré :
 * cibles à la taille du curseur, rayons plus sobres, et surtout beaucoup
 * plus de densité à l'écran.
 */
export const dt = {
  sidebar: 236,
  inspector: 336,
  topbar: 56,
  /** hauteur d'une heure dans les grilles horaires du bureau */
  hour: 52,
  radius: { xs: 6, sm: 9, md: 13, lg: 18 },
  gap: { xs: 4, sm: 8, md: 14, lg: 22 },

  /** Fonds : une pile de trois plans, du plus enfoncé au plus proche. */
  bg: '#F7F5F9',
  panel: '#FFFFFF',
  sunken: '#F1EFF5',

  line: theme.hairline,
  lineStrong: theme.hairlineStrong,
  ink: theme.ink,
  inkSoft: theme.inkSoft,
  inkFaint: theme.inkFaint,

  /** Réponse au survol et à la sélection, en surimpression. */
  hover: 'rgba(32,32,43,0.045)',
  hoverStrong: 'rgba(32,32,43,0.08)',

  shadow: {
    panel: {
      shadowColor: '#4A3F63',
      shadowOpacity: 0.07,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    pop: {
      shadowColor: '#3B3154',
      shadowOpacity: 0.18,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 18 },
    },
  },
} as const;

/** Les cinq échelles, dans l'ordre du plus large au plus serré. */
export const SCALE_ORDER = ['year', 'month', 'week', 'day'] as const;
