import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import type { Todo } from '../types';
import { SwipeRow } from './SwipeRow';

type Props = {
  todo: Todo;
  index?: number;
  onPress: (t: Todo) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onSchedule?: (t: Todo) => void;
  compact?: boolean;
};

/**
 * Dans la boîte, rien n'a d'identité : ni couleur ni emoji.
 * Le tri vient plus tard, quand l'idée trouve sa place dans le calendrier.
 */
export function TodoCard({
  todo,
  index = 0,
  onPress,
  onToggle,
  onRemove,
  onSchedule,
  compact,
}: Props) {
  return (
    <View style={styles.slot}>
      <SwipeRow
        onRight={() => onToggle(todo.id)}
        onLeft={() => onRemove(todo.id)}
        onTap={() => onPress(todo)}
        onDoubleTap={onSchedule && !todo.done ? () => onSchedule(todo) : undefined}
        rightIcon={todo.done ? 'arrow-undo' : 'checkmark'}
        radius={theme.radius.lg}
      >
        <View style={[styles.card, compact && styles.compact, todo.done && styles.cardDone]}>
          <Text
            numberOfLines={compact ? 1 : 2}
            style={[
              styles.title,
              compact && { fontSize: 14.5 },
              todo.done && styles.titleDone,
            ]}
          >
            {todo.title}
          </Text>

          {!compact && !todo.done && (
            <Text style={styles.estimate}>
              {todo.estimate >= 60 ? `${todo.estimate / 60} h` : `${todo.estimate} min`}
            </Text>
          )}
        </View>
      </SwipeRow>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { marginBottom: 9 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 16,
    ...theme.shadow.soft,
  },
  compact: { paddingVertical: 12 },
  cardDone: { backgroundColor: 'rgba(255,255,255,0.62)' },
  title: { flex: 1, fontSize: 15.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.3 },
  titleDone: { color: theme.inkFaint, textDecorationLine: 'line-through', fontWeight: '600' },
  estimate: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.inkFaint,
    fontVariant: ['tabular-nums'],
  },
});
