import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  addMonths,
  isSameDay,
  isSameMonth,
  monthMatrix,
  monthShort,
  startOfMonth,
  toKey,
} from '../lib/date';
import { tapLight } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme, type Swatch } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  year: number;
  byDay: Record<string, AgendaEvent[]>;
  onPickMonth: (date: Date) => void;
  bottomInset?: number;
  /** hauteur disponible, pour répartir les douze mois sans laisser de vide */
  available?: number;
};

type MiniProps = {
  month: Date;
  byDay: Record<string, AgendaEvent[]>;
  cell: number;
  weekStart: 0 | 1;
  today: string;
  swatch: (k: AgendaEvent['color']) => Swatch;
  onPick: (d: Date) => void;
};

const MiniMonth = memo(function MiniMonth({
  month,
  byDay,
  cell,
  weekStart,
  today,
  swatch,
  onPick,
}: MiniProps) {
  const days = monthMatrix(month, weekStart);
  const now = new Date();
  const rows = [0, 1, 2, 3, 4, 5];

  return (
    <Squish
      style={styles.mini}
      scaleTo={0.94}
      dimTo={1}
      onPress={() => {
        tapLight();
        onPick(month);
      }}
    >
      <Text style={styles.miniTitle}>{monthShort(month)}</Text>
      {rows.map((r) => (
        <View key={r} style={styles.miniRow}>
          {days.slice(r * 7, r * 7 + 7).map((d) => {
            const key = toKey(d);
            const events = byDay[key] ?? [];
            const inMonth = isSameMonth(d, month);
            const isToday = isSameDay(d, now);
            const c = events[0] ? swatch(events[0].color) : null;
            return (
              <View
                key={key}
                style={[
                  { width: cell, height: cell },
                  styles.miniCell,
                  inMonth && c ? { backgroundColor: c.wash } : null,
                  isToday ? { backgroundColor: today } : null,
                ]}
              >
                <Text
                  style={[
                    styles.miniNum,
                    { fontSize: Math.min(9.5, cell * 0.62) },
                    !inMonth && styles.miniOut,
                    inMonth && c ? { color: c.deep, fontWeight: '800' } : null,
                    isToday ? { color: '#FFFFFF', fontWeight: '800' } : null,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </Squish>
  );
});

/** Les douze mois d'un coup — on voit l'année respirer, on touche pour entrer. */
export function YearGrid({ year, byDay, onPickMonth, bottomInset = 0, available = 0 }: Props) {
  const { settings, swatch, ui } = useSettings();
  const { width } = useWindowDimensions();

  const columns = width > 520 ? 4 : 3;
  const outer = 14;
  const gap = 10;
  const miniWidth = (width - outer * 2 - gap * (columns - 1)) / columns;
  const cell = Math.floor((miniWidth - 8) / 7);

  const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(new Date(year, 0, 1)), i));

  // quatre rangées de mois : on étale l'espace restant entre elles
  const rowHeight = 22 + cell * 6 + 8;
  const spare = available > 0 ? available - rowHeight * 4 - 24 : 0;
  const rowGap = Math.max(gap, Math.min(46, spare / 3));

  return (
    <View
      style={[
        styles.wrap,
        { paddingHorizontal: outer, paddingBottom: bottomInset + 90, columnGap: gap, rowGap },
      ]}
    >
      {months.map((m) => (
        <View key={m.getMonth()} style={{ width: miniWidth }}>
          <MiniMonth
            month={m}
            byDay={byDay}
            cell={cell}
            weekStart={settings.weekStart}
            today={ui.today}
            swatch={swatch}
            onPick={onPickMonth}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 6 },
  mini: { paddingVertical: 4 },
  miniTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
    paddingLeft: 2,
  },
  miniRow: { flexDirection: 'row' },
  miniCell: { alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  miniNum: { fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
  miniOut: { opacity: 0 },
});
