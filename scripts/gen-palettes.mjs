/**
 * Construit les 5 jeux de couleurs et garantit la lisibilité :
 * on part d'une recette (teintes + saturation/luminosité), puis on assombrit
 * automatiquement jusqu'à atteindre le contraste voulu, teinte par teinte.
 */
const rgb = (h, s, l) => {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
};
const hex = (h, s, l) => '#' + rgb(h, s, l).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (str) => {
  const c = str.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const KEYS = ['blush', 'peach', 'butter', 'mint', 'sky', 'lavender', 'lilac', 'sage', 'stone'];

const SPECS = {
  pastel: {
    label: 'Pastel',
    note: 'doux, laiteux',
    names: ['Rose', 'Pêche', 'Miel', 'Menthe', 'Ciel', 'Lavande', 'Lilas', 'Sauge', 'Ardoise'],
    hues: [344, 24, 44, 158, 208, 252, 288, 92, 228],
    satK: [1, 1, 1, 1, 1, 1, 1, 1, 0.22],
    wash: [72, 92], solid: [70, 74], deep: [48, 42],
    gradient: ['#FDF4F8', '#F7F5FD', '#F2F7FC'],
    accentAt: 5, todayAt: 0,
  },
  sorbet: {
    label: 'Sorbet',
    note: 'franc, joyeux',
    names: ['Framboise', 'Mandarine', 'Citron', 'Menthe', 'Azur', 'Myrtille', 'Orchidée', 'Pistache', 'Ardoise'],
    hues: [342, 18, 40, 152, 202, 258, 296, 86, 224],
    satK: [1, 1, 1, 1, 1, 1, 1, 1, 0.25],
    wash: [94, 90], solid: [84, 60], deep: [72, 36],
    gradient: ['#FFF3F0', '#FDF6F0', '#F2F8FD'],
    accentAt: 5, todayAt: 0,
  },
  brume: {
    label: 'Brume',
    note: 'sourd, minimal',
    names: ['Cendre rose', 'Argile', 'Lin', 'Céladon', 'Givre', 'Iris', 'Bruyère', 'Tilleul', 'Ardoise'],
    hues: [338, 22, 46, 162, 206, 250, 292, 96, 222],
    satK: [1, 1, 1, 1, 1, 1, 1, 1, 0.35],
    wash: [26, 93], solid: [26, 68], deep: [22, 38],
    gradient: ['#F7F7F9', '#F4F5F8', '#F1F4F7'],
    accentAt: 5, todayAt: 0,
  },
  terre: {
    label: 'Terre',
    note: 'chaud, naturel',
    names: ['Terracotta', 'Ocre', 'Sable', 'Olive', 'Mousse', 'Orage', 'Brique', 'Bois', 'Galet'],
    hues: [14, 32, 44, 74, 128, 196, 348, 22, 34],
    satK: [1, 1, 1, 1, 1, 1, 1, 1, 0.28],
    wash: [52, 91], solid: [50, 62], deep: [46, 34],
    gradient: ['#FCF6F0', '#FAF6F1', '#F5F3EE'],
    accentAt: 0, todayAt: 6,
  },
  encre: {
    label: 'Encre',
    note: 'froid, contrasté',
    names: ['Ardoise', 'Acier', 'Marine', 'Indigo', 'Violet', 'Prune', 'Mauve', 'Bleuet', 'Graphite'],
    hues: [196, 210, 222, 234, 248, 262, 280, 300, 220],
    satK: [1, 1, 1, 1, 1, 1, 1, 1, 0.3],
    wash: [30, 93], solid: [34, 62], deep: [36, 32],
    gradient: ['#F6F7FA', '#F4F5F9', '#F1F3F8'],
    accentAt: 3, todayAt: 0,
  },
};

const TEXT_MIN = 5.0;
const SOLID_MIN = 2.15;

function build(spec) {
  return spec.hues.map((h, i) => {
    const k = spec.satK[i];
    const wash = hex(h, spec.wash[0] * k, spec.wash[1]);

    // on assombrit jusqu'à obtenir un texte franchement lisible sur le wash
    let dl = spec.deep[1];
    let deep = hex(h, spec.deep[0] * k, dl);
    while (contrast(deep, wash) < TEXT_MIN && dl > 12) {
      dl -= 1;
      deep = hex(h, spec.deep[0] * k, dl);
    }

    // idem pour la pastille, qui doit se détacher sans crier
    let sl = spec.solid[1];
    let solid = hex(h, spec.solid[0] * k, sl);
    while (contrast(solid, wash) < SOLID_MIN && sl > dl + 6) {
      sl -= 1;
      solid = hex(h, spec.solid[0] * k, sl);
    }

    return { key: KEYS[i], label: spec.names[i], wash, solid, deep };
  });
}

const out = [];
out.push('// Généré par scripts/gen-palettes.mjs — ne pas éditer à la main.');
out.push("// Chaque teinte garantit un contraste texte ≥ " + TEXT_MIN + ':1 sur son propre fond.');
out.push('');
out.push("import type { ColorKey, Swatch } from './theme';");
out.push('');
out.push("export type PaletteKey = " + Object.keys(SPECS).map((k) => `'${k}'`).join(' | ') + ';');
out.push('');
out.push('export type Palette = {');
out.push('  key: PaletteKey;');
out.push('  label: string;');
out.push('  note: string;');
out.push('  colors: Record<ColorKey, Swatch>;');
out.push('  accent: string;');
out.push('  today: string;');
out.push('  gradient: readonly [string, string, string];');
out.push('};');
out.push('');
out.push('export const PALETTES: Record<PaletteKey, Palette> = {');

let report = '';
for (const [key, spec] of Object.entries(SPECS)) {
  const sw = build(spec);
  const accentBase = sw[spec.accentAt ?? 5];
  const todayBase = sw[spec.todayAt ?? 0];
  report += `\n=== ${spec.label} ===\n`;
  let minT = 99, minS = 99;
  for (const s of sw) {
    const ct = contrast(s.deep, s.wash);
    const cs = contrast(s.solid, s.wash);
    minT = Math.min(minT, ct); minS = Math.min(minS, cs);
    report += `${s.label.padEnd(12)} ${s.wash} ${s.solid} ${s.deep}  texte ${ct.toFixed(2)}  pastille ${cs.toFixed(2)}\n`;
  }
  report += `min texte ${minT.toFixed(2)} | min pastille ${minS.toFixed(2)}\n`;

  out.push(`  ${key}: {`);
  out.push(`    key: '${key}',`);
  out.push(`    label: '${spec.label}',`);
  out.push(`    note: '${spec.note}',`);
  out.push('    colors: {');
  for (const s of sw) {
    out.push(`      ${s.key}: { wash: '${s.wash}', solid: '${s.solid}', deep: '${s.deep}', label: '${s.label}' },`);
  }
  out.push('    },');
  out.push(`    accent: '${accentBase.solid}',`);
  out.push(`    today: '${todayBase.solid}',`);
  out.push(`    gradient: [${spec.gradient.map((g) => `'${g}'`).join(', ')}] as const,`);
  out.push('  },');
}
out.push('};');
out.push('');
out.push('export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];');
out.push('');

console.log(report);
process.stdout.write('---WRITE---\n');
import('fs').then((fs) => fs.writeFileSync('/home/user/Agenda/src/palettes.ts', out.join('\n')));
