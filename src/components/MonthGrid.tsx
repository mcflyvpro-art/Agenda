import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { isSameDay, isSameMonth, monthMatrix, toKey, WEEKDAYS } from '../lib/date';
import { tapLight } from '../lib/haptics';
import { swatch, theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  month: Date;
  selectedKey: string;
  byDay: Record<string, AgendaEvent[]>;
  onSelect: (key: string) => void;
  cellHeight?: number;
  compact?: boolean;
};

type CellProps = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  events: AgendaEvent[];
  height: number;
  compact: boolean;
  onSelect: (key: string) => void;
};

const DayCell = memo(function DayCell({
  date,
  inMonth,
  isToday,
  selected,
  events,
  height,
  compact,
  onSelect,
}: CellProps) {
  const key = toKey(date);
  const first = events[0];
  const tint = first ? swatch(first.color) : null;
  const dots = events.slice(0, 3);
  const circle = compact ? 32 : 36;

  return (
    <Squish
      onPress={() => {
        tapLight();
        onSelect(key);
      }}
      style={[styles.cell, { height }]}
      scaleTo={0.9}
      dimTo={1}
    >
      <View
        style={[
          styles.cellInner,
          { paddingVertical: compact ? 3 : 5, borderRadius: theme.radius.md },
          tint && inMonth && !selected ? { backgroundColor: tint.wash } : null,
        ]}
      >
        <View style={{ width: circle, height: circle, alignItems: 'center', justifyContent: 'center' }}>
          {selected && (
            <Animated.View
              key={key}
              entering={ZoomIn.springify().damping(13).stiffness(220)}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: circle / 2,
                  backgroundColor: isToday ? theme.today : theme.ink,
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.num,
              compact && { fontSize: 14.5 },
              !inMonth && { color: theme.inkFaint, opacity: 0.45 },
              inMonth && isToday && !selected && { color: theme.today, fontWeight: '800' },
              inMonth && !!tint && !selected && !isToday && { color: tint.deep },
              selected && { color: '#FFFFFF', fontWeight: '800' },
            ]}
          >
            {date.getDate()}
          </Text>
        </View>

        {!compact ? (
          <View style={styles.dotRow}>
            {dots.map((e) => (
              <View
                key={e.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: swatch(e.color).solid,
                    opacity: inMonth ? 1 : 0.35,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.dotRow}>
            {events.length > 0 && (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: swatch(events[0].color).solid },
                ]}
              />
            )}
          </View>
        )}
      </View>
    </Squish>
  );
});

export function MonthGrid({
  month,
  selectedKey,
  byDay,
  onSelect,
  cellHeight = 62,
  compact = false,
}: Props) {
  const days = monthMatrix(month);
  const now = new Date();

  return (
    <View style={styles.wrap}>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.weekLabel, i > 4 && { color: theme.inkFaint }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((d) => {
          const key = toKey(d);
          return (
            <DayCell
              key={key}
              date={d}
              inMonth={isSameMonth(d, month)}
              isToday={isSameDay(d, now)}
              selected={key === selectedKey}
              events={byDay[key] ?? []}
              height={cellHeight}
              compact={compact}
              onSelect={onSelect}
            />
          );
        })}
      </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  cellInner: {
    width: '88%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: theme.ink,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
