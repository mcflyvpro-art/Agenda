import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { fromKey, isSameDay, shortDay, toKey, weekOf } from '../lib/date';
import { tapLight } from '../lib/haptics';
import { theme } from '../theme';
import { useSettings } from '../store/settings';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  selectedKey: string;
  byDay: Record<string, AgendaEvent[]>;
  onSelect: (key: string) => void;
};

/** Bandeau de semaine du haut de la vue Jour. */
export function WeekStrip({ selectedKey, byDay, onSelect }: Props) {
  const { settings, swatch } = useSettings();
  const days = weekOf(fromKey(selectedKey), settings.weekStart);
  const now = new Date();

  return (
    <View style={styles.row}>
      {days.map((d) => {
        const key = toKey(d);
        const selected = key === selectedKey;
        const isToday = isSameDay(d, now);
        const events = byDay[key] ?? [];
        return (
          <Squish
            key={key}
            style={styles.item}
            scaleTo={0.9}
            dimTo={1}
            onPress={() => {
              tapLight();
              onSelect(key);
            }}
          >
            <Text style={[styles.label, selected && { color: theme.ink, fontWeight: '800' }]}>
              {shortDay(d)}
            </Text>
            <View style={styles.bubbleWrap}>
              {selected && (
                <Animated.View
                  key={key}
                  entering={ZoomIn.springify().damping(13).stiffness(220)}
                  style={[
                    styles.bubble,
                    { backgroundColor: isToday ? theme.today : theme.ink },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.num,
                  isToday && !selected && { color: theme.today, fontWeight: '800' },
                  selected && { color: '#FFFFFF', fontWeight: '800' },
                ]}
              >
                {d.getDate()}
              </Text>
            </View>
            <View style={styles.dots}>
              {events.slice(0, 3).map((e) => (
                <View
                  key={e.id}
                  style={[styles.dot, { backgroundColor: swatch(e.color).solid }]}
                />
              ))}
            </View>
          </Squish>
        );
      })}
    </View>
  );
}

const BUBBLE = 38;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 6 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.inkFaint,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  bubbleWrap: {
    width: BUBBLE,
    height: BUBBLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
  },
  num: { fontSize: 16, fontWeight: '600', color: theme.ink, letterSpacing: -0.3 },
  dots: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center', marginTop: 2 },
  dot: { width: 4.5, height: 4.5, borderRadius: 3 },
});
