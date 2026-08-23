import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { durationLabel, hhmm } from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { swatch, theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  event: AgendaEvent;
  onPress: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  index?: number;
};

export function EventCard({ event, onPress, onToggle, index = 0 }: Props) {
  const c = swatch(event.color);
  const done = event.done;

  return (
    <Animated.View
      entering={FadeIn.delay(Math.min(index, 8) * 45).duration(320)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(20).stiffness(180)}
    >
      <Squish
        onPress={() => {
          tapSoft();
          onPress(event);
        }}
        style={[styles.card, { backgroundColor: c.wash, opacity: done ? 0.6 : 1 }]}
      >
        <View style={[styles.bar, { backgroundColor: c.solid }]} />

        <View style={[styles.emojiBubble, { backgroundColor: 'rgba(255,255,255,0.75)' }]}>
          <Text style={styles.emoji}>{event.emoji}</Text>
        </View>

        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: c.deep },
              done && { textDecorationLine: 'line-through' },
            ]}
          >
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: c.deep }]}>
              {event.allDay ? 'Toute la journée' : `${hhmm(event.start)} – ${hhmm(event.end)}`}
            </Text>
            {!event.allDay && (
              <>
                <View style={[styles.dot, { backgroundColor: c.solid }]} />
                <Text style={[styles.meta, { color: c.deep, opacity: 0.75 }]}>
                  {durationLabel(event.start, event.end)}
                </Text>
              </>
            )}
          </View>
          {!!event.location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={c.deep} style={{ opacity: 0.7 }} />
              <Text numberOfLines={1} style={[styles.meta, { color: c.deep, opacity: 0.8 }]}>
                {event.location}
              </Text>
            </View>
          )}
        </View>

        <Squish
          hitSlop={10}
          onPress={() => {
            tapSoft();
            onToggle(event.id);
          }}
          style={[
            styles.check,
            { borderColor: c.solid, backgroundColor: done ? c.solid : 'transparent' },
          ]}
          scaleTo={0.82}
        >
          {done ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : <View />}
        </Squish>
      </Squish>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingRight: 14,
    paddingLeft: 18,
    marginBottom: 10,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 5,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  emojiBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 19 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  meta: { fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1 },
  dot: { width: 3, height: 3, borderRadius: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
