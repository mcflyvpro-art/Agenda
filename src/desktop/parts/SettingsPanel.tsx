import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import { writeOverride } from '../../lib/platform';
import { HOUR_MAX, HOUR_MIN, useDeskPrefs } from '../store/prefs';
import { dt } from '../theme';
import { IconButton, Kbd, Press } from './Press';
import { SyncPanel } from './SyncPanel';

type Props = { visible: boolean; onClose: () => void };

const SHORTCUTS: [string, string][] = [
  ['← →', 'Période précédente / suivante'],
  ['2 doigts ←→', 'Idem, au trackpad'],
  ['Pincer', 'Changer d’échelle'],
  ['1 – 5', 'Année, Mois, Semaine, Jour, Liste'],
  ['T', 'Aujourd’hui'],
  ['N', 'Nouvel événement'],
  ['G · C · I', 'Aujourd’hui · Calendrier · Idées'],
  ['⌘K', 'Rechercher'],
  ['⌘.', 'Afficher / masquer le panneau'],
  ['⌘↵', 'Enregistrer la fiche'],
  ['⌫', 'Supprimer la fiche ouverte'],
  ['Échap', 'Fermer'],
];

/**
 * Les réglages du bureau.
 *
 * Ils ne touchent que l'interface bureau — le téléphone garde les siens,
 * dans un magasin séparé. Ce qui se règle ici est ce que l'écran large
 * rend réglable : l'amplitude horaire visible, la hauteur d'une heure,
 * les week-ends, le panneau de droite.
 */
export function SettingsPanel({ visible, onClose }: Props) {
  const { prefs, update, reset } = useDeskPrefs();
  const { ui } = useSettings();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Press onPress={onClose} style={StyleSheet.absoluteFill} hoverStyle={null} />
      <View style={styles.panel}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>Réglages</Text>
          <IconButton onPress={onClose} title="Fermer (Échap)">
            <Ionicons name="close" size={16} color={dt.inkSoft} />
          </IconButton>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Group title="Affichage">
            <Toggle
              label="Afficher les week-ends"
              on={prefs.showWeekends}
              onPress={() => update({ showWeekends: !prefs.showWeekends })}
              accent={ui.accent}
            />
            <Toggle
              label="Numéros de semaine"
              on={prefs.showWeekNumbers}
              onPress={() => update({ showWeekNumbers: !prefs.showWeekNumbers })}
              accent={ui.accent}
            />
            <Toggle
              label="Panneau de détail"
              on={prefs.inspector}
              onPress={() => update({ inspector: !prefs.inspector })}
              accent={ui.accent}
            />
          </Group>

          <Group title="Grille horaire">
            <Stepper
              label="Première heure"
              value={`${prefs.dayStart}:00`}
              onLess={() => update({ dayStart: Math.max(0, prefs.dayStart - 1) })}
              onMore={() => update({ dayStart: Math.min(prefs.dayEnd - 1, prefs.dayStart + 1) })}
            />
            <Stepper
              label="Dernière heure"
              value={`${prefs.dayEnd}:00`}
              onLess={() => update({ dayEnd: Math.max(prefs.dayStart + 1, prefs.dayEnd - 1) })}
              onMore={() => update({ dayEnd: Math.min(24, prefs.dayEnd + 1) })}
            />
            <Stepper
              label="Hauteur d’une heure"
              value={`${prefs.hourHeight} px`}
              onLess={() => update({ hourHeight: Math.max(HOUR_MIN, prefs.hourHeight - 8) })}
              onMore={() => update({ hourHeight: Math.min(HOUR_MAX, prefs.hourHeight + 8) })}
            />
          </Group>

          <Group title="Raccourcis">
            <View style={styles.shortcuts}>
              {SHORTCUTS.map(([k, label]) => (
                <View key={k} style={styles.shortcut}>
                  <Kbd>{k}</Kbd>
                  <Text style={styles.shortcutText}>{label}</Text>
                </View>
              ))}
            </View>
          </Group>

          <Group title="Synchronisation">
            <SyncPanel />
          </Group>

          <Group title="Interface">
            <Press
              onPress={() => {
                writeOverride('mobile');
                if (typeof location !== 'undefined') location.reload();
              }}
              style={styles.linkBtn}
            >
              <Ionicons name="phone-portrait-outline" size={15} color={dt.inkSoft} />
              <Text style={styles.linkText}>Passer à la version mobile</Text>
            </Press>
            <Press onPress={reset} style={styles.linkBtn}>
              <Ionicons name="refresh-outline" size={15} color={dt.inkSoft} />
              <Text style={styles.linkText}>Réglages par défaut</Text>
            </Press>
          </Group>
        </ScrollView>
      </View>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function Toggle({
  label,
  on,
  onPress,
  accent,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Press onPress={onPress} style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={[styles.toggle, on && { backgroundColor: accent }]}>
        <View style={[styles.knob, on && styles.knobOn]} />
      </View>
    </Press>
  );
}

function Stepper({
  label,
  value,
  onLess,
  onMore,
}: {
  label: string;
  value: string;
  onLess: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Press onPress={onLess} style={styles.step}>
          <Ionicons name="remove" size={14} color={dt.inkSoft} />
        </Press>
        <Text style={styles.stepValue}>{value}</Text>
        <Press onPress={onMore} style={styles.step}>
          <Ionicons name="add" size={14} color={dt.inkSoft} />
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,24,40,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },
  panel: {
    width: 520,
    maxWidth: '92%',
    maxHeight: '84%',
    backgroundColor: dt.panel,
    borderRadius: dt.radius.lg,
    overflow: 'hidden',
    ...dt.shadow.pop,
  },
  head: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  headTitle: { fontSize: 14.5, fontWeight: '800', color: dt.ink, letterSpacing: -0.3 },
  body: { padding: dt.gap.md, gap: dt.gap.md, paddingBottom: 30 },

  group: { gap: 6 },
  groupTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  groupBody: { backgroundColor: dt.sunken, borderRadius: dt.radius.md, padding: 4 },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 10,
    borderRadius: dt.radius.sm,
  },
  lineLabel: { fontSize: 12.5, fontWeight: '600', color: dt.ink },
  toggle: {
    width: 36,
    height: 21,
    borderRadius: 11,
    backgroundColor: dt.lineStrong,
    padding: 2,
    justifyContent: 'center',
  },
  knob: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF' },
  knobOn: { transform: [{ translateX: 15 }] },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: dt.panel },
  stepValue: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: dt.ink,
    fontVariant: ['tabular-nums'],
  },

  shortcuts: { padding: 6, gap: 3 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  shortcutText: { fontSize: 12, fontWeight: '600', color: dt.inkSoft },


  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 34, paddingHorizontal: 10, borderRadius: dt.radius.sm },
  linkText: { fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
});
