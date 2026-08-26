import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hhmm } from '../../lib/date';
import { useSettings } from '../../store/settings';
import { useTodos } from '../../store/todos';
import type { Todo } from '../../types';
import { dt } from '../theme';
import { Kbd, Press } from './Press';
import { MiniMonth } from './MiniMonth';
import type { Section } from '../store/prefs';

type Props = {
  section: Section;
  onSection: (s: Section) => void;
  month: Date;
  selectedKey: string;
  countOn: (key: string) => number;
  onSelectDay: (key: string) => void;
  onOpenSettings: () => void;
  onSchedule: (t: Todo) => void;
  onOpenTodo: () => void;
  nextUp: { title: string; emoji: string; start: number; color: string } | null;
};

const NAV: { key: Section; icon: keyof typeof Ionicons.glyphMap; label: string; kbd: string }[] = [
  { key: 'dashboard', icon: 'sunny-outline', label: 'Aujourd’hui', kbd: 'G' },
  { key: 'calendar', icon: 'calendar-outline', label: 'Calendrier', kbd: 'C' },
  { key: 'ideas', icon: 'sparkles-outline', label: 'Idées', kbd: 'I' },
];

/**
 * La colonne de gauche : où l'on est, et où aller.
 *
 * Elle porte trois choses que le mobile ne peut pas se permettre d'avoir
 * en permanence à l'écran — la navigation, un mois miniature pour sauter
 * n'importe où, et les idées en attente. Sur téléphone chacune de ces
 * trois occupe un écran entier ; ici elles tiennent dans une bande de
 * 236 pixels qu'on ne quitte jamais des yeux.
 */
export function Sidebar({
  section,
  onSection,
  month,
  selectedKey,
  countOn,
  onSelectDay,
  onOpenSettings,
  onSchedule,
  onOpenTodo,
  nextUp,
}: Props) {
  const { ui, swatch } = useSettings();
  const { pending } = useTodos();

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandText}>Agenda</Text>
      </View>

      <View style={styles.nav}>
        {NAV.map((n) => {
          const on = section === n.key;
          return (
            <Press
              key={n.key}
              onPress={() => onSection(n.key)}
              style={[styles.navItem, on && { backgroundColor: `${ui.accent}16` }]}
            >
              <Ionicons name={n.icon} size={16} color={on ? ui.accent : dt.inkSoft} />
              <Text style={[styles.navText, on && { color: ui.accent, fontWeight: '700' }]}>
                {n.label}
              </Text>
              {n.key === 'ideas' && pending.length > 0 && (
                <View style={[styles.badge, { backgroundColor: ui.accent }]}>
                  <Text style={styles.badgeText}>{pending.length}</Text>
                </View>
              )}
              <Kbd>{n.kbd}</Kbd>
            </Press>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mini}>
          <MiniMonth
            month={month}
            cell={26}
            selectedKey={selectedKey}
            countOn={countOn}
            onSelectDay={onSelectDay}
          />
        </View>

        {/* la prochaine chose qui arrive : l'information la plus consultée */}
        {nextUp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À suivre</Text>
            <View style={[styles.next, { backgroundColor: swatch(nextUp.color as any).wash }]}>
              <Text style={styles.nextEmoji}>{nextUp.emoji}</Text>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.nextTitle, { color: swatch(nextUp.color as any).deep }]}>
                  {nextUp.title}
                </Text>
                <Text style={[styles.nextTime, { color: swatch(nextUp.color as any).deep }]}>
                  {hhmm(nextUp.start)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{`Idées · ${pending.length}`}</Text>
            <View style={styles.todos}>
              {pending.slice(0, 8).map((t) => (
                <Press key={t.id} onPress={onOpenTodo} style={styles.todo}>
                  <Text numberOfLines={1} style={styles.todoText}>
                    {t.title}
                  </Text>
                  {/* placer une idée est l'action qu'on fait le plus souvent depuis ici */}
                  <Press
                    onPress={() => onSchedule(t)}
                    title="Placer dans l'agenda"
                    style={styles.todoGo}
                  >
                    <Ionicons name="arrow-forward" size={12} color={ui.accent} />
                  </Press>
                </Press>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Press onPress={onOpenSettings} style={styles.settings}>
        <Ionicons name="options-outline" size={16} color={dt.inkSoft} />
        <Text style={styles.navText}>Réglages</Text>
        <Kbd>,</Kbd>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: dt.sidebar,
    backgroundColor: dt.panel,
    borderRightWidth: 1,
    borderRightColor: dt.line,
  },
  flex: { flex: 1 },
  brand: {
    height: dt.topbar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: dt.gap.md,
  },
  logo: { width: 24, height: 24, borderRadius: 7 },
  brandText: { fontSize: 14.5, fontWeight: '800', color: dt.ink, letterSpacing: -0.4 },

  nav: { paddingHorizontal: dt.gap.sm, gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
  },
  navText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
  badge: { minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollBody: { paddingBottom: dt.gap.md },
  mini: { paddingHorizontal: dt.gap.sm, paddingTop: dt.gap.md },

  section: { paddingHorizontal: dt.gap.md, paddingTop: dt.gap.md, gap: 6 },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: dt.radius.sm, padding: 9 },
  nextEmoji: { fontSize: 15 },
  nextTitle: { fontSize: 12, fontWeight: '700' },
  nextTime: { fontSize: 10.5, fontWeight: '700', opacity: 0.8, fontVariant: ['tabular-nums'] },

  todos: { gap: 2 },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    borderRadius: dt.radius.xs,
    paddingLeft: 8,
    paddingRight: 4,
  },
  todoText: { flex: 1, fontSize: 12, fontWeight: '600', color: dt.inkSoft },
  todoGo: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  settings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 38,
    marginHorizontal: dt.gap.sm,
    marginBottom: dt.gap.sm,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
});
