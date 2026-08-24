import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT, SPRING } from '../lib/motion';
import { notifySuccess, tapLight, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import type { DayLayout, MonthCells, MonthPanel, WeekLayout } from '../store/settings';
import { theme } from '../theme';
import { OptionTile } from './OptionTile';
import { DayPreview, MonthPreview, PanelPreview, WeekPreview } from './previews';
import { SegmentedRow } from './SegmentedRow';
import { Squish } from './Squish';
import { Toggle } from './Toggle';

const MONTH_TILES: { key: MonthCells; label: string }[] = [
  { key: 'dots', label: 'Pastilles' },
  { key: 'tint', label: 'Teintes' },
  { key: 'bars', label: 'Barres' },
  { key: 'titles', label: 'Titres' },
  { key: 'heat', label: 'Intensité' },
];

const PANEL_TILES: { key: MonthPanel; label: string }[] = [
  { key: 'day', label: 'Le jour' },
  { key: 'none', label: 'Rien' },
];

const WEEK_TILES: { key: WeekLayout; label: string }[] = [
  { key: 'grid7', label: '7 jours' },
  { key: 'grid3', label: '3 jours' },
  { key: 'list', label: 'Liste' },
];

const DAY_TILES: { key: DayLayout; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'rail', label: 'Chronologie' },
  { key: 'list', label: 'Liste' },
];

type Tab = 'views' | 'comfort';

type Props = { visible: boolean; onClose: () => void };

export function SettingsSheet({ visible, onClose }: Props) {
  const { height } = useWindowDimensions();
  const { settings, update, reset, swatch, ui } = useSettings();
  const [tab, setTab] = useState<Tab>('views');

  const ty = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    ty.value = height;
    backdrop.value = 0;
    ty.value = withSpring(0, SPRING.panel);
    backdrop.value = withTiming(1, { duration: DUR.quick });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

        <Animated.View style={[styles.sheet, { maxHeight: height * 0.93 }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone}>
              <View style={styles.grab} />
            </View>
          </GestureDetector>

          <View style={styles.topBar}>
            <Squish
              style={styles.roundBtn}
              scaleTo={0.93}
              onPress={() => {
                tapLight();
                reset();
              }}
            >
              <Ionicons name="refresh" size={18} color={theme.inkSoft} />
            </Squish>
            <Squish
              style={[styles.roundBtn, { backgroundColor: ui.accent }]}
              scaleTo={0.93}
              onPress={() => {
                notifySuccess();
                dismiss();
              }}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </Squish>
          </View>

          <View style={styles.tabs}>
            <SegmentedRow
              value={tab}
              onChange={setTab}
              options={[
                { key: 'views', label: 'Vues' },
                { key: 'comfort', label: 'Confort' },
              ]}
            />
          </View>

          <ScrollView
            key={tab}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <View>
              {tab === 'views' && (
                <>
                  <Section title="Mois">
                    <Tiles>
                      {MONTH_TILES.map((t) => (
                        <View key={t.key} style={styles.tileHalf}>
                          <OptionTile
                            label={t.label}
                            selected={settings.monthCells === t.key}
                            onPress={() => update({ monthCells: t.key })}
                          >
                            <MonthPreview variant={t.key} swatch={swatch} accent={ui.accent} />
                          </OptionTile>
                        </View>
                      ))}
                    </Tiles>
                  </Section>

                  <Section title="Sous la grille">
                    <Tiles>
                      {PANEL_TILES.map((t) => (
                        <View key={t.key} style={styles.tileThird}>
                          <OptionTile
                            label={t.label}
                            selected={settings.monthPanel === t.key}
                            onPress={() => update({ monthPanel: t.key })}
                          >
                            <PanelPreview variant={t.key} swatch={swatch} />
                          </OptionTile>
                        </View>
                      ))}
                    </Tiles>
                  </Section>

                  <Section title="Semaine">
                    <Tiles>
                      {WEEK_TILES.map((t) => (
                        <View key={t.key} style={styles.tileThird}>
                          <OptionTile
                            label={t.label}
                            selected={settings.weekLayout === t.key}
                            onPress={() => update({ weekLayout: t.key })}
                          >
                            <WeekPreview variant={t.key} swatch={swatch} />
                          </OptionTile>
                        </View>
                      ))}
                    </Tiles>
                  </Section>

                  <Section title="Jour">
                    <Tiles>
                      {DAY_TILES.map((t) => (
                        <View key={t.key} style={styles.tileThird}>
                          <OptionTile
                            label={t.label}
                            selected={settings.dayLayout === t.key}
                            onPress={() => update({ dayLayout: t.key })}
                          >
                            <DayPreview variant={t.key} swatch={swatch} />
                          </OptionTile>
                        </View>
                      ))}
                    </Tiles>
                  </Section>

                  <Section title="Grilles horaires">
                    <View style={styles.card}>
                      <Field label="Plage affichée">
                        <SegmentedRow
                          value={settings.dayRange}
                          onChange={(dayRange) => update({ dayRange })}
                          options={[
                            { key: 'auto', label: 'Auto' },
                            { key: 'custom', label: 'Sur mesure' },
                            { key: 'full', label: '0 – 24 h' },
                          ]}
                        />
                      </Field>

                      {settings.dayRange === 'auto' && (
                        <Text style={styles.hint}>
                          La grille commence une heure avant le premier événement et finit une
                          heure après le dernier. Journée vide : 8 h – 22 h.
                        </Text>
                      )}

                      {settings.dayRange === 'custom' && (
                        <>
                          <View style={styles.hourRow}>
                            <HourPicker
                              label="Début"
                              value={settings.dayStart}
                              min={0}
                              max={settings.dayEnd - 1}
                              accent={ui.accent}
                              onChange={(dayStart) => update({ dayStart })}
                            />
                            <HourPicker
                              label="Fin"
                              value={settings.dayEnd}
                              min={settings.dayStart + 1}
                              max={24}
                              accent={ui.accent}
                              onChange={(dayEnd) => update({ dayEnd })}
                            />
                          </View>
                          <Text style={styles.hint}>
                            Un événement en dehors de la plage l'élargit : rien ne reste caché.
                          </Text>
                        </>
                      )}
                    </View>
                  </Section>
                </>
              )}

              {tab === 'comfort' && (
                <>
                  <Section title="Lecture">
                    <View style={styles.card}>
                      <Field label="Densité">
                        <SegmentedRow
                          value={settings.density}
                          onChange={(density) => update({ density })}
                          options={[
                            { key: 'compact', label: 'Compact' },
                            { key: 'normal', label: 'Normal' },
                            { key: 'roomy', label: 'Aéré' },
                          ]}
                        />
                      </Field>
                      <View style={styles.divider} />
                      <Field label="Détail des cartes">
                        <SegmentedRow
                          value={settings.detail}
                          onChange={(detail) => update({ detail })}
                          options={[
                            { key: 'minimal', label: 'Titre' },
                            { key: 'normal', label: 'Normal' },
                            { key: 'full', label: 'Complet' },
                          ]}
                        />
                      </Field>
                    </View>
                  </Section>

                  <Section title="Sur les événements">
                    <View style={styles.card}>
                      <SwitchRow
                        icon="color-wand-outline"
                        label="Deviner couleur et emoji"
                        value={settings.autoColor}
                        accent={ui.accent}
                        onChange={(autoColor) => update({ autoColor })}
                      />
                      <View style={styles.divider} />
                      <SwitchRow
                        icon="happy-outline"
                        label="Afficher les emojis"
                        value={settings.showEmoji}
                        accent={ui.accent}
                        onChange={(showEmoji) => update({ showEmoji })}
                      />
                    </View>
                  </Section>

                  <Section title="Repères">
                    <View style={styles.card}>
                      <SwitchRow
                        icon="time-outline"
                        label="Ligne de l'heure actuelle"
                        value={settings.showNowLine}
                        accent={ui.accent}
                        onChange={(showNowLine) => update({ showNowLine })}
                      />
                      <View style={styles.divider} />
                      <SwitchRow
                        icon="cafe-outline"
                        label="Week-end en retrait"
                        value={settings.dimWeekend}
                        accent={ui.accent}
                        onChange={(dimWeekend) => update({ dimWeekend })}
                      />
                      <View style={styles.divider} />
                      <SwitchRow
                        icon="grid-outline"
                        label="Numéros de semaine"
                        value={settings.showWeekNumbers}
                        accent={ui.accent}
                        onChange={(showWeekNumbers) => update({ showWeekNumbers })}
                      />
                      <View style={styles.divider} />
                      <SwitchRow
                        icon="checkmark-done-outline"
                        label="Masquer ce qui est fait"
                        value={settings.hideDone}
                        accent={ui.accent}
                        onChange={(hideDone) => update({ hideDone })}
                      />
                      <View style={styles.divider} />
                      <Field label="La semaine commence">
                        <SegmentedRow
                          value={settings.weekStart}
                          onChange={(weekStart) => update({ weekStart: weekStart as 0 | 1 })}
                          options={[
                            { key: 1, label: 'Lundi' },
                            { key: 0, label: 'Dimanche' },
                          ]}
                        />
                      </Field>
                    </View>
                  </Section>
                </>
              )}

              <View style={{ height: 28 }} />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <View style={styles.tileGrid}>{children}</View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Choix d'une heure pleine, un cran à la fois — plus sûr qu'une roulette ici. */
function HourPicker({
  label,
  value,
  min,
  max,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  accent: string;
  onChange: (v: number) => void;
}) {
  const step = (d: number) => {
    const next = Math.max(min, Math.min(max, value + d));
    if (next === value) return;
    tapLight();
    onChange(next);
  };

  return (
    <View style={styles.hourCell}>
      <Text style={styles.hourLabel}>{label}</Text>
      <View style={styles.hourStepper}>
        <Squish
          style={styles.hourBtn}
          scaleTo={0.88}
          disabled={value <= min}
          onPress={() => step(-1)}
        >
          <Ionicons
            name="remove"
            size={17}
            color={value <= min ? theme.inkFaint : accent}
          />
        </Squish>
        <Text style={styles.hourValue}>{`${`${value}`.padStart(2, '0')}:00`}</Text>
        <Squish
          style={styles.hourBtn}
          scaleTo={0.88}
          disabled={value >= max}
          onPress={() => step(1)}
        >
          <Ionicons name="add" size={17} color={value >= max ? theme.inkFaint : accent} />
        </Squish>
      </View>
    </View>
  );
}

function SwitchRow({
  icon,
  label,
  value,
  accent,
  onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: boolean;
  accent: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <Squish
      style={styles.switchRow}
      scaleTo={0.985}
      dimTo={1}
      onPress={() => {
        tapSoft();
        onChange(!value);
      }}
    >
      <Ionicons name={icon} size={17} color={value ? accent : theme.inkSoft} />
      <Text style={[styles.switchLabel, value && { color: theme.ink }]}>{label}</Text>
      <Toggle value={value} onChange={onChange} />
    </Squish>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(28,24,40,0.32)' },
  sheet: {
    backgroundColor: '#FBF9FC',
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
  tabs: { paddingHorizontal: 16, paddingBottom: 4 },
  scroll: { paddingHorizontal: 16 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.ink, letterSpacing: -0.4 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  tileHalf: { width: '48%' },
  tileThird: { width: '31.4%' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 10,
    ...theme.shadow.soft,
  },
  field: { paddingVertical: 12, gap: 9 },
  fieldLabel: { fontSize: 14.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.25 },
  hint: {
    fontSize: 12.5,
    fontWeight: '500',
    color: theme.inkFaint,
    lineHeight: 17,
    letterSpacing: -0.1,
    paddingBottom: 13,
  },
  hourRow: { flexDirection: 'row', gap: 10, paddingBottom: 12 },
  hourCell: { flex: 1, gap: 7 },
  hourLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.inkFaint,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  hourStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(32,32,43,0.04)',
    borderRadius: 14,
    padding: 4,
  },
  hourBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  hourValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.ink,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  divider: { height: 1, backgroundColor: theme.hairline },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  switchLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: theme.inkSoft,
    letterSpacing: -0.2,
  },
});
