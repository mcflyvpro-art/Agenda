import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { DayBar } from '../components/DayBar';
import { EventCard } from '../components/EventCard';
import { Squish } from '../components/Squish';
import { TodoCard } from '../components/TodoCard';
import { hhmm, longDay, minutesNow, todayKey } from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { useEvents } from '../store/events';
import { useSettings } from '../store/settings';
import { useTodos } from '../store/todos';
import { theme } from '../theme';
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
  const busy = useMemo(
    () => timed.reduce((sum, e) => sum + Math.max(0, e.end - e.start), 0),
    [timed],
  );
  const rest = today.filter((e) => e.id !== next?.id);
  const nextColor = next ? swatch(next.color) : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset + 30 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.date}>{longDay(new Date())}</Text>
        <Squish
          style={styles.iconBtn}
          scaleTo={0.88}
          onPress={() => {
            tapSoft();
            onOpenSettings();
          }}
        >
          <Ionicons name="options-outline" size={19} color={theme.inkSoft} />
        </Squish>
      </View>

      <Animated.View entering={FadeInDown.duration(300)} style={styles.block}>
        <Squish
          style={styles.glance}
          scaleTo={0.985}
          dimTo={1}
          onPress={() => {
            tapSoft();
            onOpenAgenda();
          }}
        >
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: ui.accent }]} />
              <Text style={styles.statValue}>{today.length}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={15} color={theme.inkFaint} />
              <Text style={styles.statValue}>
                {busy >= 60 ? `${Math.round((busy / 60) * 10) / 10} h` : `${busy} min`}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color={theme.inkFaint} />
          </View>
          <DayBar events={today} onPressEvent={onOpenEvent} />
        </Squish>
      </Animated.View>

      <View style={styles.block}>
        {next && nextColor ? (
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
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
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
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
          </Animated.View>
        )}
      </View>

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

      <View style={styles.block}>
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
      </View>
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
  glance: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: 16,
    ...theme.shadow.soft,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 9, height: 9, borderRadius: 5 },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.ink,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
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
