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
import { notifySuccess, tapLight, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import type { DayLayout, MonthCells, MonthPanel, WeekLayout } from '../store/settings';
import { theme } from '../theme';
import { OptionTile } from './OptionTile';
import { DayPreview, MonthPreview, PanelPreview, WeekPreview } from './previews';
import { SegmentedRow } from './SegmentedRow';
import { Squish } from './Squish';
import { Toggle } from './Toggle';

const MONTH_TILES: { key: MonthCells; label: string; hint: string }[] = [
  { key: 'dots', label: 'Pastilles', hint: 'un point par événement' },
  { key: 'tint', label: 'Teintes', hint: 'la case prend la couleur' },
  { key: 'bars', label: 'Barres', hint: 'une barre par événement' },
  { key: 'titles', label: 'Titres', hint: 'les noms dans la case' },
  { key: 'heat', label: 'Intensité', hint: 'plus foncé, plus chargé' },
];

const PANEL_TILES: { key: MonthPanel; label: string; hint: string }[] = [
  { key: 'day', label: 'Le jour', hint: 'le jour choisi' },
  { key: 'agenda', label: 'À venir', hint: 'les jours suivants' },
  { key: 'none', label: 'Rien', hint: 'grille plein écran' },
];

const WEEK_TILES: { key: WeekLayout; label: string; hint: string }[] = [
  { key: 'grid7', label: '7 jours', hint: 'la semaine entière' },
  { key: 'grid3', label: '3 jours', hint: 'plus lisible' },
  { key: 'list', label: 'Liste', hint: 'jour par jour' },
];

const DAY_TILES: { key: DayLayout; label: string; hint: string }[] = [
  { key: 'timeline', label: 'Timeline', hint: 'la grille horaire' },
  { key: 'rail', label: 'Chronologie', hint: 'creux repliés' },
  { key: 'list', label: 'Liste', hint: 'juste les cartes' },
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
    ty.value = withSpring(0, { damping: 24, stiffness: 220, mass: 0.9 });
    backdrop.value = withTiming(1, { duration: 240 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
              style={styles.resetBtn}
              onPress={() => {
                tapLight();
                reset();
              }}
            >
              <Text style={styles.reset}>Par défaut</Text>
            </Squish>
            <Text style={styles.topTitle}>Affichage</Text>
            <Squish
              style={[styles.doneBtn, { backgroundColor: ui.accent }]}
              onPress={() => {
                notifySuccess();
                dismiss();
              }}
              scaleTo={0.92}
            >
              <Text style={styles.doneText}>Terminé</Text>
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
            <Animated.View entering={FadeIn.duration(180)}>
              {tab === 'views' && (
                <>
                  <Section title="Mois" sub="Ce que raconte chaque case">
                    <Tiles>
                      {MONTH_TILES.map((t) => (
                        <View key={t.key} style={styles.tileHalf}>
                          <OptionTile
                            label={t.label}
                            hint={t.hint}
                            selected={settings.monthCells === t.key}
                            onPress={() => update({ monthCells: t.key })}
                          >
                            <MonthPreview variant={t.key} swatch={swatch} accent={ui.accent} />
                          </OptionTile>
                        </View>
                      ))}
                    </Tiles>
                  </Section>

                  <Section title="Sous la grille" sub="Le bas de l'écran en vue Mois">
                    <Tiles>
                      {PANEL_TILES.map((t) => (
                        <View key={t.key} style={styles.tileThird}>
                          <OptionTile
                            label={t.label}
                            hint={t.hint}
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
                            hint={t.hint}
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
                            hint={t.hint}
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
                      <Field label="Plage affichée" hint="jour et semaine">
                        <SegmentedRow
                          value={settings.dayRange}
                          onChange={(dayRange) => update({ dayRange })}
                          options={[
                            { key: 'full', label: '0 – 24 h' },
                            { key: 'active', label: 'Actives' },
                            { key: 'auto', label: 'Auto' },
                          ]}
                        />
                      </Field>
                    </View>
                  </Section>
                </>
              )}

              {tab === 'comfort' && (
                <>
                  <Section title="Lecture">
                    <View style={styles.card}>
                      <Field label="Densité" hint="hauteur des heures et des cases">
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
                      <Field label="Détail des cartes" hint="ce qu'une carte affiche">
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
                        hint="d'après ce que tu écris"
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
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <View style={styles.tileGrid}>{children}</View>;
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
      {children}
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function SwitchRow({
  icon,
  label,
  hint,
  value,
  accent,
  onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
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
      <View style={{ flex: 1 }}>
        <Text style={[styles.switchLabel, value && { color: theme.ink }]}>{label}</Text>
        {!!hint && <Text style={styles.switchHint}>{hint}</Text>}
      </View>
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
  resetBtn: { minWidth: 84 },
  reset: { fontSize: 14, fontWeight: '600', color: theme.inkFaint, letterSpacing: -0.2 },
  topTitle: { fontSize: 16, fontWeight: '800', color: theme.ink, letterSpacing: -0.35 },
  doneBtn: {
    minWidth: 84,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  doneText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  tabs: { paddingHorizontal: 16, paddingBottom: 4 },
  scroll: { paddingHorizontal: 16 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.ink, letterSpacing: -0.4 },
  sectionSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 2,
    letterSpacing: -0.1,
  },
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
  fieldHead: { gap: 1 },
  fieldLabel: { fontSize: 14.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.25 },
  fieldHint: { fontSize: 11.5, fontWeight: '600', color: theme.inkFaint },
  divider: { height: 1, backgroundColor: theme.hairline },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  switchLabel: { fontSize: 14.5, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
  switchHint: { fontSize: 11.5, fontWeight: '600', color: theme.inkFaint, marginTop: 1 },
});
