import React from 'react';
import { StyleSheet, View } from 'react-native';
import { alpha } from '../lib/color';
import type { DayLayout, MonthLayout, MonthPanel } from '../store/settings';
import { theme, type ColorKey, type Swatch } from '../theme';

type Swatcher = (k: ColorKey) => Swatch;

const SAMPLE: ColorKey[] = ['blush', 'sky', 'mint', 'butter', 'lavender', 'peach'];

/** Miniature d'une disposition du mois : 4 colonnes × 3 semaines. */
export function MonthPreview({ variant, swatch }: { variant: MonthLayout; swatch: Swatcher }) {
  const cells = Array.from({ length: 12 }, (_, i) => i);
  // charge factice, stable, pour donner du relief aux aperçus
  const load = [0, 1, 0, 2, 1, 0, 3, 0, 1, 2, 0, 1];

  return (
    <View style={styles.frame}>
      <View style={styles.grid}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={styles.gridRow}>
            {cells.slice(r * 4, r * 4 + 4).map((i) => {
              const n = load[i];
              const colors = SAMPLE.slice(i % 3, (i % 3) + n);
              const tint = n > 0 ? swatch(colors[0] ?? 'sky') : null;
              const heat = n > 0 ? 0.16 + (n / 3) * 0.5 : 0;

              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    variant === 'tint' && tint ? { backgroundColor: tint.wash } : null,
                    variant === 'heat' && n > 0
                      ? { backgroundColor: alpha(theme.accent, heat) }
                      : null,
                  ]}
                >
                  <View style={styles.numBar} />

                  {variant === 'minimal' && n > 0 && (
                    <View style={[styles.pdot, { backgroundColor: swatch(colors[0]).solid }]} />
                  )}

                  {(variant === 'dots' || variant === 'tint') && n > 0 && (
                    <View style={styles.pdotRow}>
                      {colors.map((c, k) => (
                        <View key={k} style={[styles.pdot, { backgroundColor: swatch(c).solid }]} />
                      ))}
                    </View>
                  )}

                  {variant === 'bars' &&
                    colors.map((c, k) => (
                      <View key={k} style={[styles.pbar, { backgroundColor: swatch(c).solid }]} />
                    ))}

                  {variant === 'preview' &&
                    colors.slice(0, 2).map((c, k) => (
                      <View key={k} style={[styles.pchip, { backgroundColor: swatch(c).wash }]}>
                        <View style={[styles.pchipLine, { backgroundColor: swatch(c).solid }]} />
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
  const bar = (c: ColorKey, k: number, w: string = '100%') => (
    <View key={k} style={[styles.listBar, { backgroundColor: swatch(c).wash, width: w as any }]}>
      <View style={[styles.listBarAccent, { backgroundColor: swatch(c).solid }]} />
    </View>
  );

  return (
    <View style={styles.frame}>
      <View style={[styles.miniGrid, variant === 'none' && { flex: 1 }]}>
        {Array.from({ length: variant === 'none' ? 18 : 8 }, (_, i) => (
          <View key={i} style={styles.miniCell} />
        ))}
      </View>
      {variant === 'day' && <View style={styles.listWrap}>{[0, 1, 2].map((i) => bar(SAMPLE[i], i))}</View>}
      {variant === 'agenda' && (
        <View style={styles.listWrap}>
          <View style={styles.dayLabel} />
          {bar('sky', 0)}
          <View style={styles.dayLabel} />
          {bar('mint', 1)}
        </View>
      )}
    </View>
  );
}

/** Miniature d'une disposition de journée. */
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

  if (variant === 'three') {
    return (
      <View style={styles.frame}>
        <View style={styles.colsWrap}>
          <View style={styles.colGutter}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.gutterTick} />
            ))}
          </View>
          {[
            [{ t: 4, h: 12, c: 'blush' }, { t: 26, h: 9, c: 'sky' }],
            [{ t: 14, h: 16, c: 'mint' }],
            [{ t: 8, h: 10, c: 'butter' }, { t: 30, h: 12, c: 'lavender' }],
          ].map((col, i) => (
            <View key={i} style={styles.colTrack}>
              {col.map((b, k) => (
                <View
                  key={k}
                  style={[
                    styles.colBlock,
                    { top: b.t, height: b.h, backgroundColor: swatch(b.c as ColorKey).wash },
                  ]}
                >
                  <View
                    style={[styles.colBlockBar, { backgroundColor: swatch(b.c as ColorKey).solid }]}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // timeline
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
          { t: 4, h: 16, c: 'blush' },
          { t: 26, h: 22, c: 'sky' },
        ].map((b, i) => (
          <View
            key={i}
            style={[
              styles.tlBlock,
              { top: b.t, height: b.h, backgroundColor: swatch(b.c as ColorKey).wash },
            ]}
          >
            <View style={[styles.tlBlockBar, { backgroundColor: swatch(b.c as ColorKey).solid }]} />
          </View>
        ))}
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
  pbar: { width: '72%', height: 2, borderRadius: 1 },
  pchip: { width: '84%', height: 3.5, borderRadius: 1.5, justifyContent: 'center', paddingLeft: 1 },
  pchipLine: { width: '55%', height: 1.5, borderRadius: 1 },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2.5, marginBottom: 4 },
  miniCell: {
    width: `${(100 - 2.5 * 3) / 4}%`,
    height: 9,
    borderRadius: 3,
    backgroundColor: 'rgba(32,32,43,0.07)',
  },
  listWrap: { gap: 4, flex: 1 },
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

  colsWrap: { flex: 1, flexDirection: 'row', gap: 3 },
  colGutter: { width: 10, justifyContent: 'space-around' },
  gutterTick: { width: 8, height: 2, borderRadius: 1, backgroundColor: 'rgba(32,32,43,0.22)' },
  colTrack: { flex: 1, backgroundColor: 'rgba(32,32,43,0.04)', borderRadius: 3 },
  colBlock: { position: 'absolute', left: 1, right: 1, borderRadius: 3, paddingLeft: 2, justifyContent: 'center' },
  colBlockBar: { width: 1.5, height: '55%', borderRadius: 1 },

  tlWrap: { flex: 1 },
  tlLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 3 },
  tlTick: { width: 9, height: 2, borderRadius: 1, backgroundColor: 'rgba(32,32,43,0.25)' },
  tlRule: { flex: 1, height: 1, backgroundColor: 'rgba(32,32,43,0.08)' },
  tlBlock: { position: 'absolute', left: 14, right: 2, borderRadius: 4, paddingLeft: 3, justifyContent: 'center' },
  tlBlockBar: { width: 2, height: '60%', borderRadius: 1 },
});
