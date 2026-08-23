// Généré par scripts/gen-palettes.mjs — ne pas éditer à la main.
// Chaque teinte garantit un contraste texte ≥ 5:1 sur son propre fond.

import type { ColorKey, Swatch } from './theme';

export type PaletteKey = 'pastel' | 'sorbet' | 'brume' | 'terre' | 'encre';

export type Palette = {
  key: PaletteKey;
  label: string;
  note: string;
  colors: Record<ColorKey, Swatch>;
  accent: string;
  today: string;
  gradient: readonly [string, string, string];
};

export const PALETTES: Record<PaletteKey, Palette> = {
  pastel: {
    key: 'pastel',
    label: 'Pastel',
    note: 'doux, laiteux',
    colors: {
      blush: { wash: '#F9DCE4', solid: '#E77996', deep: '#9F3853', label: 'Rose' },
      peach: { wash: '#F9E8DC', solid: '#E08B52', deep: '#8C5531', label: 'Pêche' },
      butter: { wash: '#F9F1DC', solid: '#CC9F24', deep: '#79642A', label: 'Miel' },
      mint: { wash: '#DCF9EF', solid: '#21BA82', deep: '#287156', label: 'Menthe' },
      sky: { wash: '#DCECF9', solid: '#5FA5E3', deep: '#32648F', label: 'Ciel' },
      lavender: { wash: '#E2DCF9', solid: '#9D8AEA', deep: '#4C389F', label: 'Lavande' },
      lilac: { wash: '#F3DCF9', solid: '#D179E7', deep: '#8A389F', label: 'Lilas' },
      sage: { wash: '#EAF9DC', solid: '#69BA21', deep: '#4A7128', label: 'Sauge' },
      stone: { wash: '#E7E9EE', solid: '#989EB3', deep: '#5B6071', label: 'Ardoise' },
    },
    accent: '#9D8AEA',
    today: '#E77996',
    gradient: ['#FDF4F8', '#F7F5FD', '#F2F7FC'] as const,
  },
  sorbet: {
    key: 'sorbet',
    label: 'Sorbet',
    note: 'franc, joyeux',
    colors: {
      blush: { wash: '#FDCEDC', solid: '#EF4377', deep: '#9E1A41', label: 'Framboise' },
      peach: { wash: '#FDDCCE', solid: '#EF7743', deep: '#9E411A', label: 'Mandarine' },
      butter: { wash: '#FDEDCE', solid: '#D89613', deep: '#845F15', label: 'Citron' },
      mint: { wash: '#CEFDE7', solid: '#10BC6C', deep: '#137648', label: 'Menthe' },
      sky: { wash: '#CEECFD', solid: '#2CA6ED', deep: '#186491', label: 'Azur' },
      lavender: { wash: '#DCCEFD', solid: '#7743EF', deep: '#411A9E', label: 'Myrtille' },
      lilac: { wash: '#FACEFD', solid: '#E343EF', deep: '#951A9E', label: 'Orchidée' },
      sage: { wash: '#E9FDCE', solid: '#71BC10', deep: '#497213', label: 'Pistache' },
      stone: { wash: '#E0E3EB', solid: '#848FAE', deep: '#4B546C', label: 'Ardoise' },
    },
    accent: '#7743EF',
    today: '#EF4377',
    gradient: ['#FFF3F0', '#FDF6F0', '#F2F8FD'] as const,
  },
  brume: {
    key: 'brume',
    label: 'Brume',
    note: 'sourd, minimal',
    colors: {
      blush: { wash: '#F2E9EC', solid: '#C195A5', deep: '#764C5B', label: 'Cendre rose' },
      peach: { wash: '#F2ECE9', solid: '#BB9D8B', deep: '#765B4C', label: 'Argile' },
      butter: { wash: '#F2F0E9', solid: '#B2A57B', deep: '#6D6446', label: 'Lin' },
      mint: { wash: '#E9F2EF', solid: '#78B09F', deep: '#466D61', label: 'Céladon' },
      sky: { wash: '#E9EEF2', solid: '#8BA6BB', deep: '#4C6476', label: 'Givre' },
      lavender: { wash: '#EAE9F2', solid: '#9F98C3', deep: '#534C76', label: 'Iris' },
      lilac: { wash: '#F1E9F2', solid: '#BB95C1', deep: '#714C76', label: 'Bruyère' },
      sage: { wash: '#ECF2E9', solid: '#8CAE75', deep: '#556D46', label: 'Tilleul' },
      stone: { wash: '#ECEDEF', solid: '#9EA3AE', deep: '#595E68', label: 'Ardoise' },
    },
    accent: '#9F98C3',
    today: '#C195A5',
    gradient: ['#F7F7F9', '#F4F5F8', '#F1F4F7'] as const,
  },
  terre: {
    key: 'terre',
    label: 'Terre',
    note: 'chaud, naturel',
    colors: {
      blush: { wash: '#F4E2DC', solid: '#CF846E', deep: '#7F412F', label: 'Terracotta' },
      peach: { wash: '#F4E9DC', solid: '#C9975E', deep: '#7F592F', label: 'Ocre' },
      butter: { wash: '#F4EEDC', solid: '#C19F44', deep: '#77632C', label: 'Sable' },
      mint: { wash: '#EEF4DC', solid: '#95B03B', deep: '#5C6C28', label: 'Olive' },
      sky: { wash: '#DCF4DF', solid: '#3DB84E', deep: '#2B7334', label: 'Mousse' },
      lavender: { wash: '#DCEEF4', solid: '#5BABC8', deep: '#2F697F', label: 'Orage' },
      lilac: { wash: '#F4DCE1', solid: '#CF6E81', deep: '#7F2F3F', label: 'Brique' },
      sage: { wash: '#F4E5DC', solid: '#CF916E', deep: '#7F4C2F', label: 'Bois' },
      stone: { wash: '#EBE8E5', solid: '#A99D8E', deep: '#62584C', label: 'Galet' },
    },
    accent: '#CF846E',
    today: '#CF6E81',
    gradient: ['#FCF6F0', '#FAF6F1', '#F5F3EE'] as const,
  },
  encre: {
    key: 'encre',
    label: 'Encre',
    note: 'froid, contrasté',
    colors: {
      blush: { wash: '#E8F0F3', solid: '#7AABBD', deep: '#345F6F', label: 'Ardoise' },
      peach: { wash: '#E8EDF3', solid: '#7D9EBF', deep: '#34526F', label: 'Acier' },
      butter: { wash: '#E8EBF3', solid: '#7D91BF', deep: '#34466F', label: 'Marine' },
      mint: { wash: '#E8E9F3', solid: '#7D84BF', deep: '#343A6F', label: 'Indigo' },
      sky: { wash: '#E9E8F3', solid: '#867DBF', deep: '#3C346F', label: 'Violet' },
      lavender: { wash: '#ECE8F3', solid: '#957DBF', deep: '#4A346F', label: 'Prune' },
      lilac: { wash: '#EFE8F3', solid: '#A97DBF', deep: '#5B346F', label: 'Mauve' },
      sage: { wash: '#F3E8F3', solid: '#BF7DBF', deep: '#6F346F', label: 'Bleuet' },
      stone: { wash: '#ECEDEF', solid: '#949BA8', deep: '#494F5A', label: 'Graphite' },
    },
    accent: '#7D84BF',
    today: '#7AABBD',
    gradient: ['#F6F7FA', '#F4F5F9', '#F1F3F8'] as const,
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];
