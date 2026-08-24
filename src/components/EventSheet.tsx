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
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT, SPRING } from '../lib/motion';
import { addMonths, chipDay, fromKey, hhmm, monthYearTitle } from '../lib/date';
import { notifySuccess, notifyWarn, tapLight, tapSoft } from '../lib/haptics';
import { COLOR_KEYS, EMOJIS, theme } from '../theme';
import { useSettings } from '../store/settings';
import { suggestFromTitle } from '../lib/suggest';
import type { AgendaEvent, Draft } from '../types';
import { MonthGrid } from './MonthGrid';
import { Squish } from './Squish';
import { TimeWheel } from './TimeWheel';
import { Toggle } from './Toggle';

type Props = {
  visible: boolean;
  draft: Draft | null;
  byDay: Record<string, AgendaEvent[]>;
  onClose: () => void;
  onSave: (d: Draft) => void;
  onDelete: (id: string) => void;
};

type Section = 'date' | 'start' | 'end' | 'emoji' | null;

export function EventSheet({
  visible,
  draft,
  byDay,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { height } = useWindowDimensions();
  const [d, setD] = useState<Draft | null>(draft);
  const [section, setSection] = useState<Section>(null);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());

  const { settings, swatch } = useSettings();
  const touched = useRef({ emoji: false, color: false });
  const ty = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible && draft) {
      setD(draft);
      setSection(null);
      setPickerMonth(fromKey(draft.date));
      touched.current = { emoji: false, color: false };
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

  const c = useMemo(() => swatch(d?.color ?? 'lavender'), [d?.color, swatch]);

  if (!d) {
    return (
      <Modal visible={false} transparent onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }

  const set = (patch: Partial<Draft>) => setD((prev) => (prev ? { ...prev, ...patch } : prev));

  /**
   * En saisissant le titre d'un nouvel événement, on propose un emoji et une
   * couleur qui collent au sujet — tant que rien n'a été choisi à la main.
   */
  const onTitleChange = (title: string) => {
    const patch: Partial<Draft> = { title };
    if (settings.autoColor && !d.id) {
      const guess = suggestFromTitle(title);
      if (guess) {
        if (!touched.current.emoji) patch.emoji = guess.emoji;
        if (!touched.current.color) patch.color = guess.color;
      }
    }
    set(patch);
  };

  const toggleSection = (s: Section) => {
    tapSoft();
    setSection((cur) => (cur === s ? null : s));
  };

  const setStart = (m: number) => {
    const dur = Math.max(15, d.end - d.start);
    set({ start: m, end: Math.min(1440, m + dur) });
  };

  const setEnd = (m: number) => {
    // permissif : on accepte tout, on recale seulement si la fin passe avant le début
    set({ end: m <= d.start ? Math.min(1440, d.start + 15) : m });
  };

  const submit = () => {
    if (!d.title.trim()) {
      notifyWarn();
    } else {
      notifySuccess();
    }
    onSave({
      ...d,
      end: d.allDay ? 1440 : Math.max(d.end, d.start + 5),
      start: d.allDay ? 0 : d.start,
    });
    dismiss();
  };

  const isEditing = !!d.id;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Animated.View style={[styles.sheet, { maxHeight: height * 0.92 }, sheetStyle]}>
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
                onPress={submit}
                style={[styles.roundBtn, { backgroundColor: c.solid }]}
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
              {/* Titre + emoji */}
              <View>
                <View style={[styles.titleRow, { backgroundColor: c.wash }]}>
                  <Squish
                    onPress={() => toggleSection('emoji')}
                    style={[styles.emojiBtn, { backgroundColor: 'rgba(255,255,255,0.8)' }]}
                    scaleTo={0.93}
                  >
                    <Text style={styles.emojiBig}>{d.emoji}</Text>
                  </Squish>
                  <TextInput
                    value={d.title}
                    onChangeText={onTitleChange}
                    placeholder="Titre"
                    placeholderTextColor={`${c.deep}66`}
                    style={[styles.titleInput, noOutline, { color: c.deep }]}
                    selectionColor={c.solid}
                    returnKeyType="done"
                  />
                </View>

                {section === 'emoji' && (
                  <View style={styles.emojiGrid}>
                    {EMOJIS.map((e) => (
                      <Squish
                        key={e}
                        scaleTo={0.95}
                        onPress={() => {
                          tapLight();
                          touched.current.emoji = true;
                          set({ emoji: e });
                          setSection(null);
                        }}
                        style={[
                          styles.emojiCell,
                          d.emoji === e && { backgroundColor: c.wash },
                        ]}
                      >
                        <Text style={styles.emojiPick}>{e}</Text>
                      </Squish>
                    ))}
                  </View>
                )}
              </View>

              {/* Couleurs */}
              <View style={styles.colorRow}>
                {COLOR_KEYS.map((k) => {
                  const s = swatch(k);
                  const active = d.color === k;
                  return (
                    <Squish
                      key={k}
                      scaleTo={0.95}
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

              {/* Quand */}
              <View style={styles.card}>
                <Row
                  icon="calendar-outline"
                  label="Date"
                  value={chipDay(fromKey(d.date))}
                  active={section === 'date'}
                  accent={c.deep}
                  onPress={() => toggleSection('date')}
                />
                {section === 'date' && (
                  <View>
                    <View style={styles.pickerHeader}>
                      <Squish
                        style={styles.navBtn}
                        onPress={() => {
                          tapLight();
                          setPickerMonth((m) => addMonths(m, -1));
                        }}
                      >
                        <Ionicons name="chevron-back" size={17} color={theme.inkSoft} />
                      </Squish>
                      <Text style={styles.pickerTitle}>{monthYearTitle(pickerMonth)}</Text>
                      <Squish
                        style={styles.navBtn}
                        onPress={() => {
                          tapLight();
                          setPickerMonth((m) => addMonths(m, 1));
                        }}
                      >
                        <Ionicons name="chevron-forward" size={17} color={theme.inkSoft} />
                      </Squish>
                    </View>
                    <MonthGrid
                      month={pickerMonth}
                      selectedKey={d.date}
                      byDay={byDay}
                      compact
                      cellHeight={44}
                      onSelect={(key) => {
                        set({ date: key });
                        setPickerMonth(fromKey(key));
                      }}
                    />
                    <View style={styles.divider} />
                  </View>
                )}

                <Squish
                  style={styles.row}
                  scaleTo={0.985}
                  dimTo={1}
                  onPress={() => {
                    tapSoft();
                    set({ allDay: !d.allDay });
                    setSection(null);
                  }}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={17}
                    color={d.allDay ? c.deep : theme.inkSoft}
                  />
                  <Text style={[styles.rowLabel, d.allDay && { color: c.deep }]}>
                    Toute la journée
                  </Text>
                  <Toggle
                    value={d.allDay}
                    color={c.solid}
                    onChange={(v) => {
                      set({ allDay: v });
                      setSection(null);
                    }}
                  />
                </Squish>

                {!d.allDay && (
                  <View>
                    <View style={styles.divider} />
                    <Row
                      icon="play-outline"
                      label="Début"
                      value={hhmm(d.start)}
                      active={section === 'start'}
                      accent={c.deep}
                      onPress={() => toggleSection('start')}
                    />
                    {section === 'start' && (
                      <View>
                        <TimeWheel value={d.start} onChange={setStart} />
                        <View style={styles.divider} />
                      </View>
                    )}
                    <Row
                      icon="flag-outline"
                      label="Fin"
                      value={hhmm(d.end)}
                      active={section === 'end'}
                      accent={c.deep}
                      onPress={() => toggleSection('end')}
                    />
                    {section === 'end' && (
                      <View>
                        <TimeWheel value={d.end} onChange={setEnd} />
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Détails */}
              <View style={styles.card}>
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={17} color={theme.inkSoft} />
                  <TextInput
                    value={d.location}
                    onChangeText={(t) => set({ location: t })}
                    placeholder="Lieu"
                    placeholderTextColor={theme.inkFaint}
                    style={[styles.input, noOutline]}
                    selectionColor={c.solid}
                  />
                </View>
                <View style={styles.divider} />
                <View style={[styles.row, { alignItems: 'flex-start' }]}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={17}
                    color={theme.inkSoft}
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={d.notes}
                    onChangeText={(t) => set({ notes: t })}
                    placeholder="Notes"
                    placeholderTextColor={theme.inkFaint}
                    style={[styles.input, styles.notes, noOutline]}
                    selectionColor={c.solid}
                    multiline
                  />
                </View>
              </View>

              {isEditing && (
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

              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  value,
  active,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Squish onPress={onPress} style={styles.row} scaleTo={0.985} dimTo={1}>
      <Ionicons name={icon} size={18} color={active ? accent : theme.inkFaint} />
      <Text style={[styles.rowLabel, active && { color: accent }]}>{label}</Text>
      <View style={[styles.chip, active && { backgroundColor: `${accent}1A` }]}>
        <Text style={[styles.chipText, active && { color: accent }]}>{value}</Text>
      </View>
      {/*
        Pendant le réglage, la ligne devient le bouton qui referme : sans ce
        repère on ne sait pas où valider. Ce n'est qu'une icône — c'est la
        ligne entière qui reçoit le tap, un bouton dans un bouton n'étant
        pas fiable sur le web.
      */}
      {active && <Ionicons name="checkmark-circle" size={21} color={accent} />}
    </Squish>
  );
}

/** Retire le halo de focus disgracieux quand l'app tourne dans un navigateur. */
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

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
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  scroll: { paddingHorizontal: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    padding: 10,
    gap: 10,
  },
  emojiBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emojiBig: { fontSize: 24 },
  titleInput: {
    flex: 1,
    fontSize: 19,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.ink, letterSpacing: -0.2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.ink,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  divider: { height: 1, backgroundColor: theme.hairline, marginLeft: 27 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.04)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.ink,
    letterSpacing: -0.2,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
  },
  notes: { minHeight: 44, textAlignVertical: 'top' },
  delete: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FDCEDC',
  },
});
