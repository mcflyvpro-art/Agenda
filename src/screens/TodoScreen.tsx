import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Squish } from '../components/Squish';
import { TodoCard } from '../components/TodoCard';
import { notifySuccess, tapLight } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { useTodos } from '../store/todos';
import { theme } from '../theme';
import type { Todo } from '../types';

type Props = {
  onOpen: (t: Todo) => void;
  onSchedule: (t: Todo) => void;
  bottomInset: number;
};

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/** La boîte : on jette, on trie plus tard. */
export function TodoScreen({ onOpen, onSchedule, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const { ui } = useSettings();
  const { pending, done, add, toggleDone, remove, clearDone } = useTodos();
  const [text, setText] = useState('');

  const submit = () => {
    const title = text.trim();
    if (!title) return;
    add(title);
    notifySuccess();
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={[styles.addRow, { marginTop: insets.top + 14 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder="Une idée…"
          placeholderTextColor={theme.inkFaint}
          style={[styles.input, noOutline]}
          selectionColor={ui.accent}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 40 }}
      >
        {pending.length === 0 && done.length === 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
            <View style={styles.emptyBubble}>
              <Ionicons name="sparkles-outline" size={26} color={theme.inkFaint} />
            </View>
          </Animated.View>
        )}

        {pending.map((t, i) => (
          <TodoCard
            key={t.id}
            todo={t}
            index={i}
            onPress={onOpen}
            onToggle={toggleDone}
            onRemove={remove}
            onSchedule={onSchedule}
          />
        ))}

        {done.length > 0 && (
          <View style={styles.doneSection}>
            <View style={styles.doneHead}>
              <View style={styles.rule} />
              <Text style={styles.doneCount}>{done.length}</Text>
              <Squish
                onPress={() => {
                  tapLight();
                  clearDone();
                }}
                style={styles.clearBtn}
                scaleTo={0.86}
              >
                <Ionicons name="trash-outline" size={15} color={theme.inkFaint} />
              </Squish>
            </View>
            {done.map((t, i) => (
              <TodoCard
                key={t.id}
                todo={t}
                index={i}
                onPress={onOpen}
                onToggle={toggleDone}
                onRemove={remove}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...theme.shadow.soft,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.ink,
    letterSpacing: -0.3,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneSection: { marginTop: 20 },
  doneHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  doneCount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
});
