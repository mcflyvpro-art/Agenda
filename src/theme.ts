import { alpha } from './lib/color';

export type ColorKey =
  | 'blush'
  | 'peach'
  | 'butter'
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'lilac'
  | 'sage'
  | 'stone';

/** Une teinte, déclinée pour ses trois rôles : fond, marque, texte. */
export type Swatch = { wash: string; solid: string; deep: string; label: string };

export const COLOR_KEYS: ColorKey[] = [
  'blush',
  'peach',
  'butter',
  'mint',
  'sky',
  'lavender',
  'lilac',
  'sage',
  'stone',
];

/** Neutres et mesures, communs à tous les jeux de couleurs. */
export const theme = {
  card: '#FFFFFF',
  ink: '#20202B',
  inkSoft: '#6C6C7C',
  inkFaint: '#A6A6B6',
  hairline: 'rgba(32,32,43,0.06)',
  hairlineStrong: 'rgba(32,32,43,0.10)',
  radius: { sm: 12, md: 18, lg: 26, xl: 34 },

  /**
   * Élévations.
   *
   * Trois hauteurs, et à chacune deux passes plutôt qu'une : une ombre
   * courte et presque opaque qui pose l'objet sur son fond, une ombre
   * longue et très diluée qui lui donne sa masse. Un halo unique — le
   * réflexe — donne un objet qui plane sans peser ; c'est le doublement
   * qui fait la différence entre « une carte avec une ombre » et une carte
   * réellement posée.
   *
   * Écrites en `boxShadow` et non en `shadow*` : la forme historique ne
   * sait porter qu'une seule passe, et elle est dépréciée des deux côtés.
   */
  shadow: {
    /** cartes ordinaires, posées dans une liste */
    soft: {
      boxShadow:
        '0 1px 2px rgba(90,76,122,0.05), 0 6px 16px -6px rgba(90,76,122,0.16)',
    },
    /** ce qui se soulève : feuilles, barres flottantes */
    lift: {
      boxShadow:
        '0 2px 6px rgba(90,76,122,0.09), 0 16px 34px -14px rgba(90,76,122,0.28)',
    },
    /** ce qui recouvre : une feuille modale au-dessus de tout */
    over: {
      boxShadow:
        '0 -1px 3px rgba(60,48,90,0.05), 0 -12px 40px -12px rgba(60,48,90,0.24)',
    },
  },
};

/**
 * Une ombre teintée de la couleur de l'objet.
 *
 * Un bouton violet dont l'ombre est grise paraît posé sur l'écran ; le
 * même bouton dont l'ombre est violette paraît allumé. C'est ce que fait
 * la lumière d'un objet coloré sur ce qui l'entoure, et c'est ce qui
 * distingue un aplat d'une source.
 */
export function glow(hex: string, strength = 1): { boxShadow: string } {
  const near = alpha(hex, 0.26 * strength);
  const far = alpha(hex, 0.42 * strength);
  return { boxShadow: `0 2px 6px ${near}, 0 14px 30px -10px ${far}` };
}

export const EMOJIS = [
  '✨', '💼', '☕️', '🏃‍♀️', '🍽️', '🎬', '📚', '🩺',
  '💜', '🎂', '✈️', '🛍️', '🧘‍♀️', '🎧', '🐾', '🌙',
  '📞', '🎨', '💅', '🚗', '🏡', '🌸', '⚽️', '🍿',
];
