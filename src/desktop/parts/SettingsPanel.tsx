import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import { writeOverride } from '../../lib/platform';
import { HOUR_MAX, HOUR_MIN, useDeskPrefs } from '../store/prefs';
import { dt, MOTION } from '../theme';
import { Appear } from './Motion';
import { IconButton, Kbd, Label, Press } from './Press';
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
      <Appear enter="fade" style={StyleSheet.absoluteFill as any}>
        <Press onPress={onClose} style={StyleSheet.absoluteFill} hoverStyle={null} />
      </Appear>

      <Appear enter="pop" style={styles.panel}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>Réglages</Text>
          <IconButton onPress={onClose} title="Fermer (Échap)">
            <Ionicons name="close" size={16} color={dt.inkSoft} />
          </IconButton>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
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
              label="Hauteur d’une heure"
              value={`${prefs.hourHeight} px`}
              onLess={() => update({ hourHeight: Math.max(HOUR_MIN, prefs.hourHeight - 8) })}
              onMore={() => update({ hourHeight: Math.min(HOUR_MAX, prefs.hourHeight + 8) })}
              atMin={prefs.hourHeight <= HOUR_MIN}
              atMax={prefs.hourHeight >= HOUR_MAX}
            />
          </Group>

          <Group title="Raccourcis">
            <View style={styles.shortcuts}>
              {SHORTCUTS.map(([k, label]) => (
                <View key={k} style={styles.shortcut}>
                  <Kbd>{k}</Kbd>
                  <Text numberOfLines={1} style={styles.shortcutText}>
                    {label}
                  </Text>
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
              <Ionicons name="chevron-forward" size={13} color={dt.inkFaint} />
            </Press>
            <Press onPress={reset} style={styles.linkBtn}>
              <Ionicons name="refresh-outline" size={15} color={dt.inkSoft} />
              <Text style={styles.linkText}>Réglages par défaut</Text>
              <Ionicons name="chevron-forward" size={13} color={dt.inkFaint} />
            </Press>
          </Group>
        </ScrollView>
      </Appear>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Label>{title}</Label>
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
        <View
          style={
            [
              styles.knob,
              {
                transform: [{ translateX: on ? 15 : 0 }],
                transitionProperty: 'transform',
                transitionDuration: MOTION.fast,
                transitionTimingFunction: MOTION.out,
              },
            ] as any
          }
        />
      </View>
    </Press>
  );
}

function Stepper({
  label,
  value,
  onLess,
  onMore,
  atMin,
  atMax,
}: {
  label: string;
  value: string;
  onLess: () => void;
  onMore: () => void;
  atMin?: boolean;
  atMax?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Press onPress={onLess} style={styles.step} disabled={atMin} sink title="Moins">
          <Ionicons name="remove" size={14} color={dt.inkSoft} />
        </Press>
        <Text style={styles.stepValue}>{value}</Text>
        <Press onPress={onMore} style={styles.step} disabled={atMax} sink title="Plus">
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
    backgroundColor: 'rgba(26,22,38,0.32)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  } as any,
  panel: {
    width: 540,
    maxWidth: '92%',
    maxHeight: '84%',
    backgroundColor: dt.panel,
    borderRadius: dt.radius.lg,
    overflow: 'hidden',
    ...dt.shadow.pop,
  },
  head: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  headTitle: { fontSize: 15, fontWeight: '800', color: dt.ink, letterSpacing: -0.35 },
  scroll: { flexShrink: 1 },
  body: { padding: dt.gap.md, gap: dt.gap.md, paddingBottom: 30 },

  group: { gap: 7 },
  groupBody: { backgroundColor: dt.sunken, borderRadius: dt.radius.md, padding: 4 },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
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
  knob: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(40,34,62,0.25)',
  } as any,

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dt.panel,
  },
  stepValue: {
    minWidth: 54,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: dt.ink,
    fontVariant: ['tabular-nums'],
  },

  /* deux colonnes : douze raccourcis en une seule feraient une liste à faire défiler */
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', padding: 7, rowGap: 6, columnGap: 10 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%' },
  shortcutText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: dt.inkSoft },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: dt.radius.sm,
  },
  linkText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
});
