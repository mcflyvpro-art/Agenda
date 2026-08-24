import React from 'react';
import { StyleSheet, View } from 'react-native';
import { alpha } from '../lib/color';
import type { Palette } from '../palettes';
import type { DayLayout, MonthCells, MonthPanel, WeekLayout } from '../store/settings';
import type { ColorKey, Swatch } from '../theme';

type Swatcher = (k: ColorKey) => Swatch;

const SAMPLE: ColorKey[] = ['blush', 'sky', 'mint', 'butter', 'lavender', 'peach'];
// charge factice mais stable : les aperçus racontent tous la même semaine
const LOAD = [0, 1, 0, 2, 1, 0, 3, 0, 1, 2, 0, 1];

/** Miniature d'une façon de remplir les cases du mois. */
export function MonthPreview({
  variant,
  swatch,
  accent,
}: {
  variant: MonthCells;
  swatch: Swatcher;
  accent: string;
}) {
  return (
    <View style={styles.frame}>
      <View style={styles.grid}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={styles.gridRow}>
            {[0, 1, 2, 3].map((c) => {
              const i = r * 4 + c;
              const n = LOAD[i];
              const colors = SAMPLE.slice(i % 3, (i % 3) + n);
              const tint = n > 0 ? swatch(colors[0] ?? 'sky') : null;
              const heat = n > 0 ? 0.16 + (n / 3) * 0.5 : 0;
              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    variant === 'tint' && tint ? { backgroundColor: tint.wash } : null,
                    variant === 'heat' && n > 0 ? { backgroundColor: alpha(accent, heat) } : null,
                  ]}
                >
                  <View style={styles.numBar} />

                  {variant === 'dots' && n > 0 && (
                    <View style={styles.pdotRow}>
                      {colors.map((k, j) => (
                        <View key={j} style={[styles.pdot, { backgroundColor: swatch(k).solid }]} />
                      ))}
                    </View>
                  )}

                  {variant === 'tint' && n > 0 && (
                    <View style={styles.pdotRow}>
                      {colors.slice(0, 2).map((k, j) => (
                        <View key={j} style={[styles.pdot, { backgroundColor: swatch(k).solid }]} />
                      ))}
                    </View>
                  )}

                  {variant === 'bars' &&
                    colors.map((k, j) => (
                      <View key={j} style={[styles.pbar, { backgroundColor: swatch(k).solid }]} />
                    ))}

                  {variant === 'titles' &&
                    colors.slice(0, 2).map((k, j) => (
                      <View key={j} style={[styles.pchip, { backgroundColor: swatch(k).wash }]}>
                        <View style={[styles.pchipLine, { backgroundColor: swatch(k).solid }]} />
                      </View>
                    ))}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Miniature de ce qui occupe le bas de l'écran en vue Mois. */
export function PanelPreview({ variant, swatch }: { variant: MonthPanel; swatch: Swatcher }) {
  const bar = (c: ColorKey, k: number) => (
    <View key={k} style={[styles.listBar, { backgroundColor: swatch(c).wash }]}>
      <View style={[styles.listBarAccent, { backgroundColor: swatch(c).solid }]} />
    </View>
  );

  return (
    <View style={styles.frame}>
      <View style={[styles.miniGrid, variant === 'none' && { flex: 1 }]}>
        {Array.from({ length: variant === 'none' ? 20 : 8 }, (_, i) => (
          <View key={i} style={styles.miniCell} />
        ))}
      </View>
      {variant === 'day' && (
        <View style={styles.listWrap}>
          <View style={styles.dayLabel} />
          {[0, 1].map((i) => bar(SAMPLE[i], i))}
        </View>
      )}
    </View>
  );
}

/** Miniature d'une façon de lire la semaine. */
export function WeekPreview({ variant, swatch }: { variant: WeekLayout; swatch: Swatcher }) {
  if (variant === 'list') {
    return (
      <View style={styles.frame}>
        <View style={styles.listWrap}>
          {[
            { c: 'blush' as ColorKey, label: true },
            { c: 'sky' as ColorKey, label: false },
            { c: 'mint' as ColorKey, label: true },
          ].map((row, i) => (
            <View key={i} style={{ gap: 3 }}>
              {row.label && <View style={styles.dayLabel} />}
              <View style={[styles.listBar, { backgroundColor: swatch(row.c).wash, height: 10 }]}>
                <View style={[styles.listBarAccent, { backgroundColor: swatch(row.c).solid }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const cols = variant === 'grid7' ? 7 : 3;
  const blocks: { col: number; t: number; h: number; c: ColorKey }[] =
    variant === 'grid7'
      ? [
          { col: 0, t: 6, h: 10, c: 'blush' },
          { col: 1, t: 18, h: 8, c: 'sky' },
          { col: 2, t: 10, h: 14, c: 'mint' },
          { col: 4, t: 24, h: 10, c: 'butter' },
          { col: 5, t: 4, h: 9, c: 'lavender' },
          { col: 6, t: 20, h: 12, c: 'peach' },
        ]
      : [
          { col: 0, t: 4, h: 12, c: 'blush' },
          { col: 0, t: 24, h: 9, c: 'sky' },
          { col: 1, t: 14, h: 16, c: 'mint' },
          { col: 2, t: 8, h: 10, c: 'butter' },
          { col: 2, t: 28, h: 12, c: 'lavender' },
        ];

  return (
    <View style={styles.frame}>
      <View style={styles.colsWrap}>
        <View style={styles.colGutter}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.gutterTick} />
          ))}
        </View>
        {Array.from({ length: cols }, (_, i) => (
          <View key={i} style={styles.colTrack}>
            {blocks
              .filter((b) => b.col === i)
              .map((b, k) => (
                <View
                  key={k}
                  style={[
                    styles.colBlock,
                    { top: b.t, height: b.h, backgroundColor: swatch(b.c).wash },
                  ]}
                >
                  {cols === 3 && (
                    <View style={[styles.colBlockBar, { backgroundColor: swatch(b.c).solid }]} />
                  )}
                </View>
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Miniature d'une façon de lire une journée. */
export function DayPreview({ variant, swatch }: { variant: DayLayout; swatch: Swatcher }) {
  if (variant === 'list') {
    return (
      <View style={styles.frame}>
        <View style={styles.listWrap}>
          {SAMPLE.slice(0, 4).map((c, i) => (
            <View key={i} style={[styles.listBar, { backgroundColor: swatch(c).wash, height: 11 }]}>
              <View style={[styles.listBarAccent, { backgroundColor: swatch(c).solid }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (variant === 'rail') {
    return (
      <View style={styles.frame}>
        <View style={styles.railWrap}>
          {[
            { c: 'blush' as ColorKey, h: 13 },
            { c: 'sky' as ColorKey, h: 10 },
            { c: 'mint' as ColorKey, h: 15 },
          ].map((row, i) => (
            <View key={i} style={styles.railRow}>
              <View style={styles.railTime} />
              <View style={styles.railCol}>
                <View style={[styles.railDot, { backgroundColor: swatch(row.c).solid }]} />
                {i < 2 && <View style={styles.railLine} />}
              </View>
              <View style={[styles.railCard, { backgroundColor: swatch(row.c).wash, height: row.h }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.tlWrap}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.tlLine, { top: 6 + i * 13 }]}>
            <View style={styles.tlTick} />
            <View style={styles.tlRule} />
          </View>
        ))}
        {[
          { t: 4, h: 16, c: 'blush' as ColorKey },
          { t: 26, h: 22, c: 'sky' as ColorKey },
        ].map((b, i) => (
          <View
            key={i}
            style={[styles.tlBlock, { top: b.t, height: b.h, backgroundColor: swatch(b.c).wash }]}
          >
            <View style={[styles.tlBlockBar, { backgroundColor: swatch(b.c).solid }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Le jeu de couleurs en entier : son fond, ses neuf teintes. */
export function PalettePreview({ palette }: { palette: Palette }) {
  const keys: ColorKey[] = ['blush', 'peach', 'butter', 'mint', 'sky', 'lavender', 'lilac', 'sage'];
  return (
    <View style={[styles.frame, { backgroundColor: palette.gradient[1] }]}>
      <View style={styles.paletteWrap}>
        {[0, 1].map((r) => (
          <View key={r} style={styles.paletteRow}>
            {keys.slice(r * 4, r * 4 + 4).map((k) => (
              <View
                key={k}
                style={[styles.paletteChip, { backgroundColor: palette.colors[k].wash }]}
              >
                <View
                  style={[styles.paletteDot, { backgroundColor: palette.colors[k].solid }]}
                />
              </View>
            ))}
          </View>
        ))}
        <View style={[styles.paletteBar, { backgroundColor: palette.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 68,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 6,
  },
  grid: { flex: 1, gap: 3, justifyContent: 'center' },
  gridRow: { flexDirection: 'row', gap: 3 },
  cell: {
    flex: 1,
    height: 17,
    borderRadius: 4,
    alignItems: 'center',
    paddingTop: 3,
    gap: 1.5,
    overflow: 'hidden',
  },
  numBar: { width: 7, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(32,32,43,0.28)' },
  pdotRow: { flexDirection: 'row', gap: 1.5 },
  pdot: { width: 3, height: 3, borderRadius: 2 },
  pbar: { width: '56%', height: 2, borderRadius: 1 },
  pchip: { width: '72%', height: 3.5, borderRadius: 1.5, justifyContent: 'center', paddingLeft: 1 },
  pchipLine: { width: '55%', height: 1.5, borderRadius: 1 },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2.5, marginBottom: 4 },
  miniCell: {
    width: `${(100 - 2.5 * 3) / 4}%`,
    height: 9,
    borderRadius: 3,
    backgroundColor: 'rgba(32,32,43,0.07)',
  },
  listWrap: { gap: 4, flex: 1, justifyContent: 'center' },
  listBar: { height: 12, borderRadius: 4, justifyContent: 'center', paddingLeft: 3 },
  listBarAccent: { width: 2, height: '60%', borderRadius: 1 },
  dayLabel: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'rgba(32,32,43,0.25)' },

  railWrap: { flex: 1, gap: 3 },
  railRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  railTime: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(32,32,43,0.28)',
    marginTop: 4,
  },
  railCol: { width: 7, alignItems: 'center' },
  railDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  railLine: { width: 1.5, flex: 1, backgroundColor: 'rgba(32,32,43,0.12)', marginTop: 1 },
  railCard: { flex: 1, borderRadius: 4 },

  colsWrap: { flex: 1, flexDirection: 'row', gap: 2 },
  colGutter: { width: 10, justifyContent: 'space-around' },
  gutterTick: { width: 8, height: 2, borderRadius: 1, backgroundColor: 'rgba(32,32,43,0.22)' },
  colTrack: { flex: 1, backgroundColor: 'rgba(32,32,43,0.04)', borderRadius: 3 },
  colBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 3,
    paddingLeft: 2,
    justifyContent: 'center',
  },
  colBlockBar: { width: 1.5, height: '55%', borderRadius: 1 },

  tlWrap: { flex: 1 },
  tlLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tlTick: { width: 9, height: 2, borderRadius: 1, backgroundColor: 'rgba(32,32,43,0.25)' },
  tlRule: { flex: 1, height: 1, backgroundColor: 'rgba(32,32,43,0.08)' },
  tlBlock: {
    position: 'absolute',
    left: 14,
    right: 2,
    borderRadius: 4,
    paddingLeft: 3,
    justifyContent: 'center',
  },
  tlBlockBar: { width: 2, height: '60%', borderRadius: 1 },

  paletteWrap: { flex: 1, gap: 4, justifyContent: 'center' },
  paletteRow: { flexDirection: 'row', gap: 4 },
  paletteChip: {
    flex: 1,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteDot: { width: 6, height: 6, borderRadius: 3 },
  paletteBar: { height: 4, borderRadius: 2, width: '46%' },
});
