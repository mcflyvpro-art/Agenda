/**
 * Palette pastel — chaque teinte existe en 3 valeurs :
 *  - wash  : fond de carte, très clair
 *  - solid : la pastille / la barre d'accent
 *  - deep  : le texte lisible sur le wash
 */
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

export type Swatch = { wash: string; solid: string; deep: string; label: string };

export const PALETTE: Record<ColorKey, Swatch> = {
  blush: { wash: '#FFE4EC', solid: '#F8A9C0', deep: '#B85274', label: 'Rose' },
  peach: { wash: '#FFE8D8', solid: '#F9B384', deep: '#BE6C36', label: 'Pêche' },
  butter: { wash: '#FCF1D0', solid: '#EFCE72', deep: '#9A7715', label: 'Miel' },
  mint: { wash: '#DAF3E7', solid: '#8CD9B6', deep: '#2F8763', label: 'Menthe' },
  sky: { wash: '#DCEAFB', solid: '#93BFF0', deep: '#3D74B0', label: 'Ciel' },
  lavender: { wash: '#E6E1FB', solid: '#B0A4EE', deep: '#6154BC', label: 'Lavande' },
  lilac: { wash: '#F4E2FA', solid: '#D9A7EA', deep: '#95479F', label: 'Lilas' },
  sage: { wash: '#E7EFDE', solid: '#B4CB98', deep: '#63803F', label: 'Sauge' },
  stone: { wash: '#E8E9EF', solid: '#B5B8C6', deep: '#5F6478', label: 'Ardoise' },
};

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export const swatch = (key: ColorKey): Swatch => PALETTE[key] ?? PALETTE.lavender;

export const theme = {
  bg: '#FBF9FC',
  bgGradient: ['#FDF4F8', '#F7F5FD', '#F2F7FC'] as const,
  card: '#FFFFFF',
  ink: '#20202B',
  inkSoft: '#6C6C7C',
  inkFaint: '#A6A6B6',
  hairline: 'rgba(32,32,43,0.06)',
  hairlineStrong: 'rgba(32,32,43,0.10)',
  accent: '#8E7CE8',
  today: '#F58BA9',
  radius: { sm: 12, md: 18, lg: 26, xl: 34 },
  space: (n: number) => n * 4,
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
