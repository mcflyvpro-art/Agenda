import { shift } from './lib/color';

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

/** Trois façons de porter la même palette. */
export type Tone = 'pastel' | 'vif' | 'doux';

export const TONES: { key: Tone; label: string }[] = [
  { key: 'pastel', label: 'Pastel' },
  { key: 'vif', label: 'Vif' },
  { key: 'doux', label: 'Doux' },
];

/** wash / solid / deep : [facteur de saturation, décalage de luminosité] */
const TONE_RECIPES: Record<Tone, { wash: [number, number]; solid: [number, number]; deep: [number, number] }> = {
  pastel: { wash: [1, 0], solid: [1, 0], deep: [1, 0] },
  vif: { wash: [1.2, -3], solid: [1.35, -9], deep: [1.2, -6] },
  doux: { wash: [0.62, 2], solid: [0.55, 7], deep: [0.66, 5] },
};

const toneCache = new Map<Tone, Record<ColorKey, Swatch>>();

export function tonedPalette(tone: Tone): Record<ColorKey, Swatch> {
  const cached = toneCache.get(tone);
  if (cached) return cached;
  const recipe = TONE_RECIPES[tone] ?? TONE_RECIPES.pastel;
  const out = {} as Record<ColorKey, Swatch>;
  for (const key of COLOR_KEYS) {
    const base = PALETTE[key];
    out[key] = {
      label: base.label,
      wash: shift(base.wash, recipe.wash[0], recipe.wash[1]),
      solid: shift(base.solid, recipe.solid[0], recipe.solid[1]),
      deep: shift(base.deep, recipe.deep[0], recipe.deep[1]),
    };
  }
  toneCache.set(tone, out);
  return out;
}

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
