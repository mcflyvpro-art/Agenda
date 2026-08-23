import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { notifySuccess, notifyWarn, tapLight, tapSoft } from '../lib/haptics';
import { suggestFromTitle } from '../lib/suggest';
import { useSettings } from '../store/settings';
import { COLOR_KEYS, EMOJIS, theme } from '../theme';
import type { Todo, TodoDraft } from '../types';
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

export function TodoSheet({ visible, draft, onClose, onSave, onDelete, onSchedule }: Props) {
  const { height } = useWindowDimensions();
  const { settings, swatch } = useSettings();
  const [d, setD] = useState<TodoDraft | null>(draft);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const touched = useRef({ emoji: false, color: false });

  const ty = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible && draft) {
      setD(draft);
      setEmojiOpen(false);
      touched.current = { emoji: false, color: false };
      ty.value = height;
      backdrop.value = 0;
      ty.value = withSpring(0, { damping: 24, stiffness: 220, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 240 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, draft]);

  const finish = () => onClose();

  const dismiss = () => {
    backdrop.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(height, { duration: 220 }, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      ty.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 130 || e.velocityY > 900) {
        backdrop.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(height, { duration: 200 }, (done) => {
          if (done) runOnJS(finish)();
        });
      } else {
        ty.value = withSpring(0, { damping: 22, stiffness: 240 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const c = useMemo(() => swatch(d?.color ?? 'lavender'), [d?.color, swatch]);

  if (!d) {
    return (
      <Modal visible={false} transparent onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }

  const set = (patch: Partial<TodoDraft>) => setD((prev) => (prev ? { ...prev, ...patch } : prev));

  const onTitleChange = (title: string) => {
    const patch: Partial<TodoDraft> = { title };
    if (settings.autoColor && !d.id) {
      const guess = suggestFromTitle(title);
      if (guess) {
        if (!touched.current.emoji) patch.emoji = guess.emoji;
        if (!touched.current.color) patch.color = guess.color;
      }
    }
    set(patch);
  };

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
              <Squish onPress={dismiss} style={styles.topBtn} scaleTo={0.9}>
                <Text style={styles.cancel}>Annuler</Text>
              </Squish>
              <Text style={styles.topTitle}>{d.id ? "L'idée" : 'Nouvelle idée'}</Text>
              <Squish
                onPress={() => {
                  if (d.title.trim()) notifySuccess();
                  else notifyWarn();
                  onSave(d);
                  dismiss();
                }}
                style={[styles.saveBtn, { backgroundColor: c.solid }]}
                scaleTo={0.92}
              >
                <Text style={styles.saveText}>OK</Text>
              </Squish>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <View style={[styles.titleRow, { backgroundColor: c.wash }]}>
                <Squish
                  onPress={() => {
                    tapSoft();
                    setEmojiOpen((v) => !v);
                  }}
                  style={styles.emojiBtn}
                  scaleTo={0.88}
                >
                  <Text style={styles.emojiBig}>{d.emoji}</Text>
                </Squish>
                <TextInput
                  value={d.title}
                  onChangeText={onTitleChange}
                  placeholder="Qu'est-ce qu'il y a à faire ?"
                  placeholderTextColor={`${c.deep}66`}
                  style={[styles.titleInput, noOutline, { color: c.deep }]}
                  selectionColor={c.solid}
                  autoFocus={!d.id}
                  returnKeyType="done"
                />
              </View>

              {emojiOpen && (
                <Animated.View
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(120)}
                  style={styles.emojiGrid}
                >
                  {EMOJIS.map((e) => (
                    <Squish
                      key={e}
                      scaleTo={0.82}
                      onPress={() => {
                        tapLight();
                        touched.current.emoji = true;
                        set({ emoji: e });
                        setEmojiOpen(false);
                      }}
                      style={[styles.emojiCell, d.emoji === e && { backgroundColor: c.wash }]}
                    >
                      <Text style={styles.emojiPick}>{e}</Text>
                    </Squish>
                  ))}
                </Animated.View>
              )}

              <View style={styles.colorRow}>
                {COLOR_KEYS.map((k) => {
                  const s = swatch(k);
                  const active = d.color === k;
                  return (
                    <Squish
                      key={k}
                      scaleTo={0.82}
                      dimTo={1}
                      onPress={() => {
                        tapLight();
                        touched.current.color = true;
                        set({ color: k });
                      }}
                      style={styles.colorHit}
                    >
                      <View
                        style={[
                          styles.colorRing,
                          active && { borderColor: s.solid, backgroundColor: s.wash },
                        ]}
                      >
                        <View style={[styles.colorDot, { backgroundColor: s.solid }]} />
                      </View>
                    </Squish>
                  );
                })}
              </View>

              <View style={styles.card}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Ça prendra à peu près</Text>
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
                    color={theme.inkSoft}
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={d.notes}
                    onChangeText={(notes) => set({ notes })}
                    placeholder="Notes"
                    placeholderTextColor={theme.inkFaint}
                    style={[styles.input, styles.notes, noOutline]}
                    selectionColor={c.solid}
                    multiline
                  />
                </View>
              </View>

              <Squish
                style={[styles.plan, { backgroundColor: c.solid }]}
                onPress={() => {
                  tapSoft();
                  onSchedule(d);
                  dismiss();
                }}
              >
                <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
                <Text style={styles.planText}>Placer dans le calendrier</Text>
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
                  <Ionicons name="trash-outline" size={16} color="#9E1A41" />
                  <Text style={styles.deleteText}>Supprimer</Text>
                </Squish>
              )}

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
    paddingBottom: 10,
  },
  topBtn: { minWidth: 70 },
  cancel: { fontSize: 15, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
  topTitle: { fontSize: 15.5, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  saveBtn: {
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  saveText: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    padding: 10,
    gap: 10,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  emojiBig: { fontSize: 24 },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: 6,
    ...theme.shadow.soft,
  },
  emojiCell: {
    width: `${100 / 8}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  emojiPick: { fontSize: 20 },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  colorHit: { padding: 2 },
  colorRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  card: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...theme.shadow.soft,
  },
  field: { paddingVertical: 12, gap: 9 },
  fieldLabel: { fontSize: 14.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.25 },
  divider: { height: 1, backgroundColor: theme.hairline },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: theme.ink, letterSpacing: -0.2 },
  notes: { minHeight: 40, textAlignVertical: 'top' },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: theme.radius.lg,
  },
  planText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FDCEDC',
  },
  deleteText: { fontSize: 14.5, fontWeight: '700', color: '#9E1A41', letterSpacing: -0.2 },
});
