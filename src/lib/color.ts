/** Petites conversions de couleurs, pour décliner la palette en plusieurs tonalités. */

type HSL = { h: number; s: number; l: number };

export function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: HSL): string {
  const sat = clamp(s, 0, 100) / 100;
  const lum = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = lum - c / 2;
  const to = (v: number) =>
    Math.round(clamp((v + m) * 255, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Multiplie la saturation et décale la luminosité d'une couleur hex. */
export function shift(hex: string, satFactor: number, lumDelta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex({ h, s: s * satFactor, l: l + lumDelta });
}

/** '#RRGGBB' + opacité → 'rgba(r, g, b, a)' */
export function alpha(hex: string, a: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
