import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getISOWeek,
  isSameDay,
  isSameMonth,
  isWeekend,
  monthMatrix,
  toKey,
  weekdayLabels,
} from '../lib/date';
import { alpha } from '../lib/color';
import { tapLight, tapMedium } from '../lib/haptics';
import { useSettings } from '../store/settings';
import type { MonthCells } from '../store/settings';
import { theme, type Swatch } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  month: Date;
  selectedKey: string;
  byDay: Record<string, AgendaEvent[]>;
  onSelect: (key: string) => void;
  /** appui long sur un jour : on y crée directement */
  onLongSelect?: (key: string) => void;
  cellHeight?: number;
  /** version réduite utilisée dans la fiche événement */
  compact?: boolean;
  /** force une disposition (sinon celle des réglages) */
  layout?: MonthCells;
};

type CellProps = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  events: AgendaEvent[];
  height: number;
  compact: boolean;
  layout: MonthCells;
  dim: boolean;
  maxLoad: number;
  accent: string;
  today: string;
  swatch: (k: AgendaEvent['color']) => Swatch;
  onSelect: (key: string) => void;
  onLongSelect?: (key: string) => void;
};

const DayCell = memo(function DayCell({
  date,
  inMonth,
  isToday,
  selected,
  events,
  height,
  compact,
  layout,
  dim,
  maxLoad,
  accent,
  today,
  swatch,
  onSelect,
  onLongSelect,
}: CellProps) {
  const key = toKey(date);
  const tint = events[0] ? swatch(events[0].color) : null;
  const circle = compact ? 30 : layout === 'titles' ? 24 : 34;
  const showTint = !compact && layout === 'tint' && !!tint && inMonth;
  const heat =
    !compact && layout === 'heat' && inMonth && events.length > 0
      ? Math.min(0.9, 0.18 + (events.length / Math.max(2, maxLoad)) * 0.6)
      : 0;

  const numColor = selected
    ? '#FFFFFF'
    : !inMonth
      ? theme.inkFaint
      : isToday
        ? today
        : showTint && tint
          ? tint.deep
          : dim
            ? theme.inkFaint
            : theme.ink;

  return (
    <Squish
      onPress={() => {
        tapLight();
        onSelect(key);
      }}
      onLongPress={
        onLongSelect
          ? () => {
              tapMedium();
              onLongSelect(key);
            }
          : undefined
      }
      delayLongPress={320}
      style={[styles.cell, { height }]}
      scaleTo={0.94}
      dimTo={1}
    >
      <View
        style={[
          styles.cellInner,
          {
            paddingVertical: compact ? 3 : 5,
            borderRadius: theme.radius.md,
            justifyContent: layout === 'titles' && !compact ? 'flex-start' : 'center',
            // en plein écran les cases deviennent très hautes : sans plafond,
            // la teinte de fond s'étire en longue barre. Les titres, eux, ont
            // besoin de toute la hauteur pour empiler leurs étiquettes.
            maxHeight: compact || layout === 'titles' ? undefined : 74,
          },
          showTint && tint ? { backgroundColor: tint.wash } : null,
          heat > 0 ? { backgroundColor: alpha(accent, heat) } : null,
          !showTint && heat === 0 && dim && inMonth
            ? { backgroundColor: 'rgba(32,32,43,0.035)' }
            : null,
        ]}
      >
        <View
          style={{
            width: circle,
            height: circle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <View
              key={key}
              style={
                [
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: circle / 2,
                    backgroundColor: isToday ? today : theme.ink,
                    // la pastille éclaire la case sous elle : sans ce halo,
                    // un disque plein posé sur une teinte pâle a l'air découpé
                    boxShadow: `0 2px 8px -2px ${alpha(isToday ? today : theme.ink, 0.55)}`,
                  },
                ] as any
              }
            />
          )}
          <Text
            style={[
              styles.num,
              compact && { fontSize: 14.5 },
              layout === 'titles' && !compact && { fontSize: 13.5 },
              { color: numColor },
              !inMonth && { opacity: 0.45 },
              (isToday || selected) && { fontWeight: '800' },
            ]}
          >
            {date.getDate()}
          </Text>
        </View>

        <Marks
          layout={compact ? 'compact' : layout}
          events={events}
          inMonth={inMonth}
          selected={selected}
          swatch={swatch}
        />
      </View>
    </Squish>
  );
});

function Marks({
  layout,
  events,
  inMonth,
  selected,
  swatch,
}: {
  layout: MonthCells | 'compact';
  events: AgendaEvent[];
  inMonth: boolean;
  selected: boolean;
  swatch: (k: AgendaEvent['color']) => Swatch;
}) {
  if (layout === 'heat') return null;
  const opacity = inMonth ? 1 : 0.35;

  if (layout === 'compact') {
    return (
      <View style={styles.markRow}>
        {events.length > 0 && (
          <View
            style={[
              styles.dot,
              { backgroundColor: selected ? theme.inkFaint : swatch(events[0].color).solid, opacity },
            ]}
          />
        )}
      </View>
    );
  }

  if (layout === 'bars') {
    return (
      <View style={styles.barStack}>
        {events.slice(0, 3).map((e) => (
          <View
            key={e.id}
            style={[styles.bar, { backgroundColor: swatch(e.color).solid, opacity }]}
          />
        ))}
      </View>
    );
  }

  if (layout === 'titles') {
    return (
      <View style={styles.chipStack}>
        {events.slice(0, 3).map((e) => {
          const c = swatch(e.color);
          return (
            <View key={e.id} style={[styles.chip, { backgroundColor: c.wash, opacity }]}>
              <Text numberOfLines={1} style={[styles.chipText, { color: c.deep }]}>
                {e.title}
              </Text>
            </View>
          );
        })}
        {events.length > 3 && (
          <Text style={styles.more}>+{events.length - 3}</Text>
        )}
      </View>
    );
  }

  // 'dots' et 'tint'
  return (
    <View style={styles.markRow}>
      {events.slice(0, 3).map((e) => (
        <View
          key={e.id}
          style={[styles.dot, { backgroundColor: swatch(e.color).solid, opacity }]}
        />
      ))}
    </View>
  );
}

export function MonthGrid({
  month,
  selectedKey,
  byDay,
  onSelect,
  onLongSelect,
  cellHeight = 58,
  compact = false,
  layout,
}: Props) {
  const { settings, swatch, ui } = useSettings();
  const activeLayout = layout ?? settings.monthCells;
  const days = monthMatrix(month, settings.weekStart);
  const now = new Date();
  const maxLoad = days.reduce((m, d) => Math.max(m, (byDay[toKey(d)] ?? []).length), 0);

  const weekNums = !compact && settings.showWeekNumbers;
  const rows = [0, 1, 2, 3, 4, 5];

  /**
   * En mode « Titres », une semaine chargée mérite plus de place qu'une semaine
   * vide : on répartit la même hauteur totale au prorata du contenu.
   */
  const rowHeights = (() => {
    const uniform = rows.map(() => cellHeight);
    if (compact || activeLayout !== 'titles') return uniform;
    const weights = rows.map((r) => {
      const busiest = Math.max(
        0,
        ...days.slice(r * 7, r * 7 + 7).map((d) => (byDay[toKey(d)] ?? []).length),
      );
      return 1 + Math.min(3, busiest) * 0.62;
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    const total = cellHeight * 6;
    return weights.map((w) => Math.max(38, (total * w) / sum));
  })();

  return (
    <View style={styles.wrap}>
      <View style={styles.weekHeader}>
        {weekNums && <View style={styles.weekNumCol} />}
        {weekdayLabels(settings.weekStart).map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {rows.map((r) => (
        <View key={r} style={styles.row}>
          {weekNums && (
            <View style={[styles.weekNumCol, { height: rowHeights[r] }]}>
              <Text style={styles.weekNumText}>{getISOWeek(days[r * 7])}</Text>
            </View>
          )}
          {days.slice(r * 7, r * 7 + 7).map((d) => {
            const key = toKey(d);
            return (
              <DayCell
                key={key}
                date={d}
                inMonth={isSameMonth(d, month)}
                isToday={isSameDay(d, now)}
                selected={key === selectedKey}
                events={byDay[key] ?? []}
                height={rowHeights[r]}
                compact={compact}
                layout={activeLayout}
                dim={!compact && settings.dimWeekend && isWeekend(d)}
                maxLoad={maxLoad}
                accent={ui.accent}
                today={ui.today}
                swatch={swatch}
                onSelect={onSelect}
                onLongSelect={onLongSelect}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: theme.inkSoft,
    opacity: 0.7,
  },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekNumCol: { width: 22, alignItems: 'center', justifyContent: 'center' },
  weekNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.inkFaint,
    opacity: 0.65,
    fontVariant: ['tabular-nums'],
  },
  cellInner: { width: '88%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  markRow: {
    flexDirection: 'row',
    gap: 3,
    height: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  barStack: { width: '78%', gap: 2.5, marginTop: 3, minHeight: 7 },
  bar: { height: 3, borderRadius: 2 },
  chipStack: { width: '96%', gap: 2, marginTop: 2 },
  chip: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1.5 },
  chipText: { fontSize: 8, fontWeight: '700', letterSpacing: -0.1 },
  more: { fontSize: 7.5, fontWeight: '700', color: theme.inkFaint, paddingLeft: 3 },
});
