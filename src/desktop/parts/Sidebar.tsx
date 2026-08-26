import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hhmm } from '../../lib/date';
import { useSettings } from '../../store/settings';
import { useTodos } from '../../store/todos';
import type { Todo } from '../../types';
import { alpha, dt, MOTION } from '../theme';
import { Kbd, Label, Press } from './Press';
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

const NAV_H = 34;

/**
 * La colonne de gauche : où l'on est, et où aller.
 *
 * Elle porte trois choses que le mobile ne peut pas se permettre d'avoir
 * en permanence à l'écran — la navigation, un mois miniature pour sauter
 * n'importe où, et les idées en attente. Sur téléphone chacune de ces
 * trois occupe un écran entier ; ici elles tiennent dans une bande de
 * 244 pixels qu'on ne quitte jamais des yeux.
 *
 * Comme la barre du haut, elle est translucide : le fond de
 * l'application transparaît à travers, ce qui la rattache à la fenêtre au
 * lieu d'en faire un bloc rapporté. C'est la matière des barres latérales
 * de macOS, et elle a une vertu pratique — le contenu qui défile derrière
 * reste deviné, donc le regard sait qu'il ne s'arrête pas là.
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
  const index = NAV.findIndex((n) => n.key === section);
  const next = nextUp ? swatch(nextUp.color as any) : null;

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <View style={styles.logoBox}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        </View>
        <Text style={styles.brandText}>Agenda</Text>
      </View>

      <View style={styles.nav}>
        {/*
          Le repère de la section active glisse d'une entrée à l'autre au
          lieu de s'allumer sur place : trois entrées de même hauteur, donc
          une simple multiplication suffit — pas besoin de les mesurer.
        */}
        {index >= 0 && (
          <View
            pointerEvents="none"
            style={
              [
                styles.navPill,
                {
                  backgroundColor: alpha(ui.accent, 0.13),
                  transform: [{ translateY: index * (NAV_H + 2) }],
                  transitionProperty: 'transform, background-color',
                  transitionDuration: MOTION.base,
                  transitionTimingFunction: MOTION.out,
                },
              ] as any
            }
          />
        )}
        {NAV.map((n) => {
          const on = section === n.key;
          return (
            <Press
              key={n.key}
              onPress={() => onSection(n.key)}
              style={styles.navItem}
              hoverStyle={on ? null : styles.navHover}
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
            cell={27}
            selectedKey={selectedKey}
            countOn={countOn}
            onSelectDay={onSelectDay}
          />
        </View>

        {/* la prochaine chose qui arrive : l'information la plus consultée */}
        {nextUp && next && (
          <View style={styles.section}>
            <Label>À suivre</Label>
            <View style={[styles.next, { backgroundColor: next.wash }]}>
              <View style={[styles.nextBar, { backgroundColor: next.solid }]} />
              <Text style={styles.nextEmoji}>{nextUp.emoji}</Text>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.nextTitle, { color: next.deep }]}>
                  {nextUp.title}
                </Text>
                <Text style={[styles.nextTime, { color: next.deep }]}>{hhmm(nextUp.start)}</Text>
              </View>
            </View>
          </View>
        )}

        {pending.length > 0 && (
          <View style={styles.section}>
            <Label>{`Idées · ${pending.length}`}</Label>
            <View style={styles.todos}>
              {pending.slice(0, 8).map((t) => (
                <TodoLine
                  key={t.id}
                  todo={t}
                  accent={ui.accent}
                  onOpen={onOpenTodo}
                  onSchedule={onSchedule}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Press onPress={onOpenSettings} style={styles.settings}>
          <Ionicons name="options-outline" size={16} color={dt.inkSoft} />
          <Text style={styles.navText}>Réglages</Text>
          <Kbd>,</Kbd>
        </Press>
      </View>
    </View>
  );
}

/**
 * Une idée en attente, dans la colonne.
 *
 * La flèche « placer dans l'agenda » n'apparaît qu'au survol de sa
 * rangée. Huit flèches alignées en permanence feraient une colonne de
 * boutons là où il ne doit y avoir qu'une liste ; sortir l'état de survol
 * dans ce petit composant évite au passage de redessiner les sept autres
 * rangées à chaque déplacement du curseur.
 */
function TodoLine({
  todo,
  accent,
  onOpen,
  onSchedule,
}: {
  todo: Todo;
  accent: string;
  onOpen: () => void;
  onSchedule: (t: Todo) => void;
}) {
  const [hover, setHover] = useState(false);
  const onHoverChange = useCallback((h: boolean) => setHover(h), []);

  return (
    <Press onPress={onOpen} style={styles.todo} onHoverChange={onHoverChange}>
      <View style={[styles.todoDot, { backgroundColor: alpha(accent, hover ? 0.9 : 0.34) }]} />
      <Text numberOfLines={1} style={styles.todoText}>
        {todo.title}
      </Text>
      {/* placer une idée est l'action qu'on fait le plus souvent depuis ici */}
      {hover && (
        <Press
          onPress={() => onSchedule(todo)}
          title="Placer dans l'agenda"
          style={[styles.todoGo, { backgroundColor: alpha(accent, 0.14) }]}
          sink
        >
          <Ionicons name="arrow-forward" size={12} color={accent} />
        </Press>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  root: {
    width: dt.sidebar,
    backgroundColor: dt.veil,
    backdropFilter: dt.veilBlur,
    WebkitBackdropFilter: dt.veilBlur,
    borderRadius: dt.panelRadius,
    overflow: 'hidden',
    ...dt.shadow.float,
  } as any,
  flex: { flex: 1 },

  brand: {
    height: dt.topbar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: dt.gap.md,
  },
  logoBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    overflow: 'hidden',
    ...dt.shadow.flat,
  },
  logo: { width: 26, height: 26 },
  brandText: { fontSize: 15, fontWeight: '800', color: dt.ink, letterSpacing: -0.45 },

  nav: { paddingHorizontal: dt.gap.sm, gap: 2, position: 'relative' },
  navPill: {
    position: 'absolute',
    left: dt.gap.sm,
    right: dt.gap.sm,
    top: 0,
    height: NAV_H,
    borderRadius: dt.radius.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: NAV_H,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
  },
  navHover: { backgroundColor: dt.hover },
  navText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
  badge: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollBody: { paddingBottom: dt.gap.md },
  mini: { paddingHorizontal: dt.gap.sm, paddingTop: dt.gap.md },

  section: { paddingHorizontal: dt.gap.md, paddingTop: dt.gap.lg, gap: 7 },

  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: dt.radius.sm,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 9,
    overflow: 'hidden',
  },
  nextBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  nextEmoji: { fontSize: 15 },
  nextTitle: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  nextTime: {
    fontSize: 10.5,
    fontWeight: '700',
    opacity: 0.8,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },

  todos: { gap: 1 },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 29,
    borderRadius: dt.radius.xs,
    paddingLeft: 8,
    paddingRight: 4,
  },
  todoDot: { width: 5, height: 5, borderRadius: 3 },
  todoText: { flex: 1, fontSize: 12, fontWeight: '600', color: dt.inkSoft },
  todoGo: { width: 21, height: 21, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  footer: {
    borderTopWidth: 1,
    borderTopColor: dt.line,
    padding: dt.gap.sm,
  },
  settings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 34,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
  },
});
