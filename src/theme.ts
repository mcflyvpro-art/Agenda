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
  shadow: {
    soft: {
      shadowColor: '#6A5A8C',
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    lift: {
      shadowColor: '#5A4C7A',
      shadowOpacity: 0.16,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
      elevation: 10,
    },
  },
};

export const EMOJIS = [
  '✨', '💼', '☕️', '🏃‍♀️', '🍽️', '🎬', '📚', '🩺',
  '💜', '🎂', '✈️', '🛍️', '🧘‍♀️', '🎧', '🐾', '🌙',
  '📞', '🎨', '💅', '🚗', '🏡', '🌸', '⚽️', '🍿',
];
