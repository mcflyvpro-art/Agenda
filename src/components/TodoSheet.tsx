import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT, SPRING } from '../lib/motion';
import { notifySuccess, notifyWarn, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { TodoDraft } from '../types';
import { SegmentedRow } from './SegmentedRow';
import { Squish } from './Squish';

type Props = {
  visible: boolean;
  draft: TodoDraft | null;
  onClose: () => void;
  onSave: (d: TodoDraft) => void;
  onDelete: (id: string) => void;
  onSchedule: (t: TodoDraft) => void;
};

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/** Une idée se saisit en une ligne. Le reste attend le calendrier. */
export function TodoSheet({ visible, draft, onClose, onSave, onDelete, onSchedule }: Props) {
  const { height } = useWindowDimensions();
  const { ui } = useSettings();
  const [d, setD] = useState<TodoDraft | null>(draft);

  const ty = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible && draft) {
      setD(draft);
      ty.value = height;
      backdrop.value = 0;
      ty.value = withSpring(0, SPRING.panel);
      backdrop.value = withTiming(1, { duration: DUR.quick });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, draft]);

  const finish = () => onClose();

  const dismiss = () => {
    backdrop.value = withTiming(0, { duration: DUR.instant });
    ty.value = withTiming(height, { duration: DUR.smooth, easing: EASE_OUT }, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      ty.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 130 || e.velocityY > 900) {
        backdrop.value = withTiming(0, { duration: DUR.instant });
        ty.value = withTiming(height, { duration: DUR.smooth, easing: EASE_OUT }, (done) => {
          if (done) runOnJS(finish)();
        });
      } else {
        ty.value = withSpring(0, SPRING.settle);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!d) {
    return (
      <Modal visible={false} transparent onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }

  const set = (patch: Partial<TodoDraft>) => setD((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Animated.View style={[styles.sheet, { maxHeight: height * 0.9 }, sheetStyle]}>
            <GestureDetector gesture={pan}>
              <View style={styles.grabZone}>
                <View style={styles.grab} />
              </View>
            </GestureDetector>

            <View style={styles.topBar}>
              <Squish onPress={dismiss} style={styles.roundBtn} scaleTo={0.93}>
                <Ionicons name="close" size={19} color={theme.inkSoft} />
              </Squish>
              <Squish
                onPress={() => {
                  if (d.title.trim()) notifySuccess();
                  else notifyWarn();
                  onSave(d);
                  dismiss();
                }}
                style={[styles.roundBtn, { backgroundColor: ui.accent }]}
                scaleTo={0.93}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </Squish>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <TextInput
                value={d.title}
                onChangeText={(title) => set({ title })}
                placeholder="Une idée…"
                placeholderTextColor={theme.inkFaint}
                style={[styles.titleInput, noOutline]}
                selectionColor={ui.accent}
                autoFocus={!d.id}
                returnKeyType="done"
                multiline
              />

              <View style={styles.card}>
                <View style={styles.field}>
                  <SegmentedRow
                    value={d.estimate}
                    onChange={(estimate) => set({ estimate })}
                    options={[
                      { key: 15, label: '15 min' },
                      { key: 30, label: '30 min' },
                      { key: 60, label: '1 h' },
                      { key: 120, label: '2 h' },
                    ]}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.noteRow}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={17}
                    color={theme.inkFaint}
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={d.notes}
                    onChangeText={(notes) => set({ notes })}
                    placeholderTextColor={theme.inkFaint}
                    style={[styles.input, noOutline]}
                    selectionColor={ui.accent}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.actions}>
                <Squish
                  style={[styles.plan, { backgroundColor: ui.accent }]}
                  onPress={() => {
                    tapSoft();
                    onSchedule(d);
                    dismiss();
                  }}
                >
                  <Ionicons name="calendar" size={20} color="#FFFFFF" />
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ opacity: 0.8 }} />
                </Squish>

                {!!d.id && (
                  <Squish
                    style={styles.delete}
                    onPress={() => {
                      notifyWarn();
                      onDelete(d.id!);
                      dismiss();
                    }}
                  >
                    <Ionicons name="trash-outline" size={19} color="#9E1A41" />
                  </Squish>
                )}
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(28,24,40,0.32)' },
  kav: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  sheet: {
    backgroundColor: '#FCFBFE',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: 6,
    ...theme.shadow.lift,
  },
  grabZone: { alignItems: 'center', paddingVertical: 8 },
  grab: { width: 42, height: 5, borderRadius: 3, backgroundColor: 'rgba(32,32,43,0.14)' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  scroll: { paddingHorizontal: 16 },
  titleInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: theme.ink,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 60,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...theme.shadow.soft,
  },
  field: { paddingVertical: 12 },
  divider: { height: 1, backgroundColor: theme.hairline },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.ink,
    letterSpacing: -0.2,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  plan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
  },
  delete: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: '#FDCEDC',
  },
});
