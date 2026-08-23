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
import { suggestFromTitle } from '../lib/suggest';
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

/** La boîte à idées : on y jette, on trie plus tard. */
export function TodoScreen({ onOpen, onSchedule, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const { settings, ui } = useSettings();
  const { pending, done, add, toggleDone, clearDone } = useTodos();
  const [text, setText] = useState('');

  const submit = () => {
    const title = text.trim();
    if (!title) return;
    const guess = settings.autoColor ? suggestFromTitle(title) : null;
    add(title, guess ? { emoji: guess.emoji, color: guess.color } : {});
    notifySuccess();
    setText('');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.title}>À faire</Text>
        <Text style={styles.subtitle}>
          {pending.length === 0
            ? 'la boîte est vide'
            : `${pending.length} ${pending.length > 1 ? 'idées' : 'idée'} en attente`}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder="Jeter une idée ici…"
            placeholderTextColor={theme.inkFaint}
            style={[styles.input, noOutline]}
            selectionColor={ui.accent}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Squish
            scaleTo={0.88}
            onPress={submit}
            style={[
              styles.addBtn,
              { backgroundColor: text.trim() ? ui.accent : 'rgba(32,32,43,0.09)' },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={19}
              color={text.trim() ? '#FFFFFF' : theme.inkFaint}
            />
          </Squish>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 40 }}
        >
          {pending.length === 0 && done.length === 0 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
              <Text style={styles.emptyEmoji}>🫧</Text>
              <Text style={styles.emptyTitle}>Rien en attente</Text>
              <Text style={styles.emptySub}>
                Écris ce qui te passe par la tête. Tu lui trouveras une place plus tard.
              </Text>
            </Animated.View>
          )}

          {pending.map((t, i) => (
            <TodoCard
              key={t.id}
              todo={t}
              index={i}
              onPress={onOpen}
              onToggle={toggleDone}
              onSchedule={onSchedule}
            />
          ))}

          {done.length > 0 && (
            <View style={styles.doneSection}>
              <View style={styles.doneHead}>
                <Text style={styles.doneTitle}>
                  {done.length} {done.length > 1 ? 'terminées' : 'terminée'}
                </Text>
                <View style={styles.rule} />
                <Squish
                  onPress={() => {
                    tapLight();
                    clearDone();
                  }}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearText}>Vider</Text>
                </Squish>
              </View>
              {done.map((t, i) => (
                <TodoCard key={t.id} todo={t} index={i} onPress={onOpen} onToggle={toggleDone} />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 29, fontWeight: '800', color: theme.ink, letterSpacing: -0.9 },
  subtitle: { fontSize: 13, fontWeight: '600', color: theme.inkFaint, marginTop: 2 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    ...theme.shadow.soft,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '600',
    color: theme.ink,
    letterSpacing: -0.2,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 34, marginBottom: 12 },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  emptySub: {
    fontSize: 13.5,
    fontWeight: '500',
    color: theme.inkFaint,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  doneSection: { marginTop: 18 },
  doneHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  doneTitle: { fontSize: 13.5, fontWeight: '800', color: theme.inkFaint, letterSpacing: -0.2 },
  rule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(32,32,43,0.05)' },
  clearText: { fontSize: 12, fontWeight: '700', color: theme.inkSoft },
});
