import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { Todo } from '../types';
import { Squish } from './Squish';

type Props = {
  todo: Todo;
  index?: number;
  onPress: (t: Todo) => void;
  onToggle: (id: string) => void;
  onSchedule?: (t: Todo) => void;
  compact?: boolean;
};

/** Une idée en attente : on la coche, on l'ouvre, ou on lui donne un créneau. */
export function TodoCard({ todo, index = 0, onPress, onToggle, onSchedule, compact }: Props) {
  const { settings, swatch } = useSettings();
  const c = swatch(todo.color);

  return (
    <Animated.View
      entering={FadeIn.delay(Math.min(index, 6) * 40).duration(260)}
      exiting={FadeOut.duration(140)}
    >
      <Squish
        onPress={() => {
          tapSoft();
          onPress(todo);
        }}
        style={[
          styles.card,
          { backgroundColor: c.wash, opacity: todo.done ? 0.55 : 1 },
          compact && styles.cardCompact,
        ]}
      >
        <Squish
          hitSlop={8}
          scaleTo={0.82}
          onPress={() => {
            tapSoft();
            onToggle(todo.id);
          }}
          style={[
            styles.check,
            { borderColor: c.solid, backgroundColor: todo.done ? c.solid : 'transparent' },
          ]}
        >
          {todo.done ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : <View />}
        </Squish>

        {settings.showEmoji && <Text style={styles.emoji}>{todo.emoji}</Text>}

        <View style={styles.body}>
          <Text
            numberOfLines={compact ? 1 : 2}
            style={[
              styles.title,
              { color: c.deep },
              compact && { fontSize: 14.5 },
              todo.done && { textDecorationLine: 'line-through' },
            ]}
          >
            {todo.title}
          </Text>
          {!compact && !!todo.notes && (
            <Text numberOfLines={1} style={[styles.notes, { color: c.deep }]}>
              {todo.notes}
            </Text>
          )}
        </View>

        {!compact && !todo.done && !!onSchedule && (
          <Squish
            hitSlop={8}
            scaleTo={0.86}
            onPress={() => {
              tapSoft();
              onSchedule(todo);
            }}
            style={[styles.schedule, { backgroundColor: c.solid }]}
          >
            <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
            <Text style={styles.scheduleText}>Placer</Text>
          </Squish>
        )}
      </Squish>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  cardCompact: { paddingVertical: 10, marginBottom: 7 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 17 },
  body: { flex: 1 },
  title: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.3 },
  notes: { fontSize: 12.5, fontWeight: '500', opacity: 0.75, marginTop: 2 },
  schedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scheduleText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.1 },
});
