import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { notifySuccess, tapLight, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import type { DayLayout, MonthLayout, MonthPanel } from '../store/settings';
import { COLOR_KEYS, theme, tonedPalette, TONES } from '../theme';
import { OptionTile } from './OptionTile';
import { DayPreview, MonthPreview, PanelPreview } from './previews';
import { SegmentedRow } from './SegmentedRow';
import { Squish } from './Squish';
import { Toggle } from './Toggle';

const MONTH_TILES: { key: MonthLayout; label: string; hint: string }[] = [
  { key: 'minimal', label: 'Épuré', hint: 'les jours, rien de plus' },
  { key: 'dots', label: 'Pastilles', hint: 'un point par événement' },
  { key: 'tint', label: 'Teintes', hint: 'la case prend la couleur' },
  { key: 'bars', label: 'Barres', hint: 'une barre par événement' },
  { key: 'preview', label: 'Aperçu', hint: 'les titres dans la case' },
  { key: 'heat', label: 'Intensité', hint: 'plus foncé, plus chargé' },
];

const PANEL_TILES: { key: MonthPanel; label: string; hint: string }[] = [
  { key: 'day', label: 'Le jour', hint: 'le jour choisi' },
  { key: 'agenda', label: 'Agenda', hint: 'les jours à venir' },
  { key: 'none', label: 'Plein écran', hint: 'que le calendrier' },
];

const DAY_TILES: { key: DayLayout; label: string; hint: string }[] = [
  { key: 'timeline', label: 'Timeline', hint: 'la grille horaire' },
  { key: 'rail', label: 'Chronologie', hint: 'heures creuses repliées' },
  { key: 'list', label: 'Liste', hint: 'juste les cartes' },
  { key: 'three', label: '3 jours', hint: 'trois colonnes' },
];

type Props = { visible: boolean; onClose: () => void };

export function SettingsSheet({ visible, onClose }: Props) {
  const { height } = useWindowDimensions();
  const { settings, update, reset, swatch } = useSettings();

  const ty = useSharedValue(height);
  const backdrop = useSharedValue(0);

  React.useEffect(() => {
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
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
              style={styles.doneBtn}
              onPress={() => {
                notifySuccess();
                dismiss();
              }}
              scaleTo={0.92}
            >
              <Text style={styles.doneText}>Terminé</Text>
            </Squish>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Section title="Vue Mois" sub="Comment chaque jour se raconte dans la grille">
              <View style={styles.tileGrid}>
                {MONTH_TILES.map((t) => (
                  <View key={t.key} style={styles.tileHalf}>
                    <OptionTile
                      label={t.label}
                      hint={t.hint}
                      selected={settings.monthLayout === t.key}
                      onPress={() => update({ monthLayout: t.key })}
                    >
                      <MonthPreview variant={t.key} swatch={swatch} />
                    </OptionTile>
                  </View>
                ))}
              </View>
            </Section>

            <Section title="Sous le calendrier" sub="Ce qui occupe le bas de l'écran">
              <View style={styles.tileGrid}>
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
              </View>
            </Section>

            <Section title="Vue Jour" sub="Quatre façons de lire une journée">
              <View style={styles.tileGrid}>
                {DAY_TILES.map((t) => (
                  <View key={t.key} style={styles.tileHalf}>
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
              </View>
            </Section>

            <Section title="Réglage fin">
              <View style={styles.card}>
                <Field label="Plage horaire" hint="ce que la timeline montre">
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
                <View style={styles.divider} />
                <Field label="Densité" hint="hauteur d'une heure et des cases">
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

            <Section title="Tonalité" sub="La même palette, portée autrement">
              <View style={styles.tileGrid}>
                {TONES.map((t) => {
                  const p = tonedPalette(t.key);
                  return (
                    <View key={t.key} style={styles.tileThird}>
                      <OptionTile
                        label={t.label}
                        selected={settings.tone === t.key}
                        onPress={() => update({ tone: t.key })}
                      >
                        <View style={styles.toneFrame}>
                          {COLOR_KEYS.slice(0, 5).map((k) => (
                            <View key={k} style={[styles.toneRow, { backgroundColor: p[k].wash }]}>
                              <View style={[styles.toneDot, { backgroundColor: p[k].solid }]} />
                            </View>
                          ))}
                        </View>
                      </OptionTile>
                    </View>
                  );
                })}
              </View>
            </Section>

            <Section title="Petites choses">
              <View style={styles.card}>
                <SwitchRow
                  icon="happy-outline"
                  label="Emojis sur les événements"
                  value={settings.showEmoji}
                  onChange={(showEmoji) => update({ showEmoji })}
                />
                <View style={styles.divider} />
                <SwitchRow
                  icon="time-outline"
                  label="Ligne de l'heure actuelle"
                  value={settings.showNowLine}
                  onChange={(showNowLine) => update({ showNowLine })}
                />
                <View style={styles.divider} />
                <SwitchRow
                  icon="cafe-outline"
                  label="Week-end en retrait"
                  value={settings.dimWeekend}
                  onChange={(dimWeekend) => update({ dimWeekend })}
                />
                <View style={styles.divider} />
                <SwitchRow
                  icon="grid-outline"
                  label="Numéros de semaine"
                  value={settings.showWeekNumbers}
                  onChange={(showWeekNumbers) => update({ showWeekNumbers })}
                />
                <View style={styles.divider} />
                <SwitchRow
                  icon="checkmark-done-outline"
                  label="Masquer ce qui est fait"
                  value={settings.hideDone}
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

            <View style={{ height: 28 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
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
  value,
  onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: boolean;
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
      <Ionicons name={icon} size={17} color={value ? theme.accent : theme.inkSoft} />
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
    paddingBottom: 8,
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
    backgroundColor: theme.accent,
  },
  doneText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.ink, letterSpacing: -0.4 },
  sectionSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 2,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tileHalf: { width: '48%', flexGrow: 1 },
  tileThird: { width: '31%', flexGrow: 1 },
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
  switchLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
  toneFrame: { height: 68, padding: 8, gap: 4, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  toneRow: { height: 8, borderRadius: 4, justifyContent: 'center', paddingLeft: 3 },
  toneDot: { width: 4, height: 4, borderRadius: 2 },
});
