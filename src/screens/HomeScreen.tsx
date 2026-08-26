import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, stagger } from '../components/Appear';
import { DayBar } from '../components/DayBar';
import { DayRing } from '../components/DayRing';
import { EventCard } from '../components/EventCard';
import { Squish } from '../components/Squish';
import { TodoCard } from '../components/TodoCard';
import { durationLabel, hhmm, longDay, minutesNow, todayKey } from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { useEvents } from '../store/events';
import { useSettings } from '../store/settings';
import { useTodos } from '../store/todos';
import { glow, theme } from '../theme';
import type { AgendaEvent, Todo } from '../types';

type Props = {
  onOpenAgenda: () => void;
  onOpenTodos: () => void;
  onCreateToday: () => void;
  onOpenEvent: (e: AgendaEvent) => void;
  onToggleEvent: (id: string) => void;
  onRemoveEvent: (id: string) => void;
  onOpenTodo: (t: Todo) => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onScheduleTodo: (t: Todo) => void;
  onOpenSettings: () => void;
  bottomInset: number;
};

/** Une mesure du jour : la valeur d'abord, ce qu'elle mesure en dessous. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text numberOfLines={1} style={styles.tileValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.tileLabel}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Minutes réellement occupées, chevauchements fusionnés.
 * Additionner bêtement les durées compterait deux fois deux rendez-vous
 * qui se superposent — et le tableau de bord annoncerait plus d'heures
 * que la journée n'en contient.
 */
function busyMinutes(events: AgendaEvent[], from = 0, to = 1440): number {
  const spans = events
    .filter((e) => !e.allDay)
    .map((e) => [Math.max(from, e.start), Math.min(to, e.end)] as const)
    .filter(([s, x]) => x > s)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let openStart = -1;
  let openEnd = -1;
  for (const [s, x] of spans) {
    if (s > openEnd) {
      if (openEnd > openStart) total += openEnd - openStart;
      openStart = s;
      openEnd = x;
    } else if (x > openEnd) {
      openEnd = x;
    }
  }
  if (openEnd > openStart) total += openEnd - openStart;
  return total;
}

function untilLabel(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return '···';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `${h} h` : `${h} h ${`${m}`.padStart(2, '0')}`;
}

/** Aujourd'hui, sans un mot de trop. */
export function HomeScreen({
  onOpenAgenda,
  onOpenTodos,
  onCreateToday,
  onOpenEvent,
  onToggleEvent,
  onRemoveEvent,
  onOpenTodo,
  onToggleTodo,
  onRemoveTodo,
  onScheduleTodo,
  onOpenSettings,
  bottomInset,
}: Props) {
  const insets = useSafeAreaInsets();
  const { eventsOn } = useEvents();
  const { pending } = useTodos();
  const { settings, swatch, ui } = useSettings();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const all = eventsOn(todayKey());
  const today = settings.hideDone ? all.filter((e) => !e.done) : all;
  const now = minutesNow();

  const timed = useMemo(() => today.filter((e) => !e.allDay), [today]);
  const next = useMemo(() => timed.find((e) => e.end > now && !e.done) ?? null, [timed, now]);
  const rest = today.filter((e) => e.id !== next?.id);
  const nextColor = next ? swatch(next.color) : null;

  /*
    Les compteurs se lisent toujours sur la journée entière (`all`), jamais
    sur la liste filtrée : « masquer ce qui est fait » range la liste, il ne
    doit pas faire mentir le tableau de bord — sinon « faits » afficherait
    éternellement 0.
  */
  const doneCount = useMemo(() => all.filter((e) => e.done).length, [all]);
  const busy = useMemo(() => busyMinutes(all), [all]);
  // le temps encore libre : ce qui reste de la journée, moins ce qui y est déjà pris
  const free = useMemo(
    () => Math.max(0, 1440 - now - busyMinutes(all, now)),
    [all, now],
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset + 30 }}
    >
      <Appear style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.date}>{longDay(new Date())}</Text>
        <Squish
          style={styles.iconBtn}
          scaleTo={0.93}
          onPress={() => {
            tapSoft();
            onOpenSettings();
          }}
        >
          <Ionicons name="options-outline" size={19} color={theme.inkSoft} />
        </Squish>
      </Appear>

      <Appear delay={stagger(1)} style={styles.block}>
        {/*
          Le bloc "ouvrir l'agenda" (anneau + tuiles) et la barre du jour ont
          chacun leur propre zone tactile : elles ne doivent jamais s'imbriquer
          (un bouton dans un bouton n'est pas fiable, en particulier sur le web).
        */}
        <View style={[styles.hero, glow(ui.accent, 1.05)]}>
          <LinearGradient
            colors={[ui.accent, ui.today]}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Squish
            style={styles.heroTop}
            scaleTo={0.99}
            dimTo={1}
            onPress={() => {
              tapSoft();
              onOpenAgenda();
            }}
          >
            <DayRing events={all} now={now} size={132} />

            <View style={styles.tiles}>
              <Stat label="Prévus" value={`${all.length}`} />
              <Stat label="Faits" value={`${doneCount}/${all.length}`} />
              <Stat label="Occupé" value={durationLabel(0, busy)} />
              <Stat label="Libre" value={durationLabel(0, free)} />
            </View>
          </Squish>

          <DayBar events={all} onPressEvent={onOpenEvent} dark />
        </View>
      </Appear>

      <Appear delay={stagger(2)} style={styles.block}>
        {next && nextColor ? (
          <View >
            <Squish
              style={[styles.next, { backgroundColor: nextColor.wash }]}
              onPress={() => {
                tapSoft();
                onOpenEvent(next);
              }}
            >
              <View style={styles.nextTop}>
                {settings.showEmoji && <Text style={styles.nextEmoji}>{next.emoji}</Text>}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.nextTitle, { color: nextColor.deep }]}>
                    {next.title}
                  </Text>
                  <Text style={[styles.nextTime, { color: nextColor.deep }]}>
                    {next.allDay ? '—' : `${hhmm(next.start)} – ${hhmm(next.end)}`}
                    {next.location ? ` · ${next.location}` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: nextColor.solid }]}>
                  <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{untilLabel(next.start, now)}</Text>
                </View>
              </View>
            </Squish>
          </View>
        ) : (
          <View >
            <Squish
              style={styles.quiet}
              onPress={() => {
                tapSoft();
                onCreateToday();
              }}
            >
              <View style={[styles.quietPlus, { backgroundColor: ui.accent }]}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
            </Squish>
          </View>
        )}
      </Appear>

      {rest.length > 0 && (
        <View style={styles.block}>
          {rest.map((e, i) => (
            <EventCard
              key={e.id}
              event={e}
              index={i}
              onPress={onOpenEvent}
              onToggle={onToggleEvent}
              onRemove={onRemoveEvent}
            />
          ))}
        </View>
      )}

      <Appear delay={stagger(4)} style={styles.block}>
        <Squish style={styles.todoHead} scaleTo={0.99} dimTo={1} onPress={onOpenTodos}>
          <View style={styles.rule} />
          <Ionicons name="sparkles" size={14} color={ui.accent} />
          <Text style={[styles.todoCount, { color: ui.accent }]}>{pending.length}</Text>
          <Ionicons name="chevron-forward" size={14} color={ui.accent} />
        </Squish>

        {pending.slice(0, 3).map((t, i) => (
          <TodoCard
            key={t.id}
            todo={t}
            index={i}
            compact
            onPress={onOpenTodo}
            onToggle={onToggleTodo}
            onRemove={onRemoveTodo}
            onSchedule={onScheduleTodo}
          />
        ))}
      </Appear>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  date: { flex: 1, fontSize: 27, fontWeight: '800', color: theme.ink, letterSpacing: -0.8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...theme.shadow.soft,
  },
  block: { paddingHorizontal: 18, marginBottom: 18 },
  hero: {
    borderRadius: theme.radius.xl,
    padding: 20,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 20,
  },
  tiles: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    // deux par ligne : la largeur en pourcentage laisse la gouttière respirer
    width: '47.5%',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  next: { borderRadius: theme.radius.lg, padding: 16 },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextEmoji: { fontSize: 26 },
  nextTitle: { fontSize: 18.5, fontWeight: '800', letterSpacing: -0.5 },
  nextTime: { fontSize: 13.5, fontWeight: '600', marginTop: 3, opacity: 0.85 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 13,
  },
  badgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  quiet: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingVertical: 26,
    alignItems: 'center',
    ...theme.shadow.soft,
  },
  quietPlus: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  todoHead: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 14 },
  rule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  todoCount: { fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
