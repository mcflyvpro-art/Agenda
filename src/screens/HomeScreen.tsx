import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { DayBar } from '../components/DayBar';
import { EventCard } from '../components/EventCard';
import { Squish } from '../components/Squish';
import { TodoCard } from '../components/TodoCard';
import { durationLabel, hhmm, longDay, minutesNow, todayKey } from '../lib/date';
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
  onOpenTodo: (t: Todo) => void;
  onToggleTodo: (id: string) => void;
  onScheduleTodo: (t: Todo) => void;
  onOpenSettings: () => void;
  bottomInset: number;
};

function greeting(hour: number): string {
  if (hour < 6) return 'Bonne nuit';
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function untilLabel(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return 'en cours';
  if (diff < 60) return `dans ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `dans ${h} h` : `dans ${h} h ${`${m}`.padStart(2, '0')}`;
}

/** Le premier écran : ce qu'il y a aujourd'hui, et deux portes vers le reste. */
export function HomeScreen({
  onOpenAgenda,
  onOpenTodos,
  onCreateToday,
  onOpenEvent,
  onToggleEvent,
  onOpenTodo,
  onToggleTodo,
  onScheduleTodo,
  onOpenSettings,
  bottomInset,
}: Props) {
  const insets = useSafeAreaInsets();
  const { eventsOn } = useEvents();
  const { pending } = useTodos();
  const { settings, swatch, ui } = useSettings();
  const [, setTick] = useState(0);

  // l'heure avance : le résumé aussi
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const key = todayKey();
  const all = eventsOn(key);
  const today = settings.hideDone ? all.filter((e) => !e.done) : all;
  const now = minutesNow();

  const timed = useMemo(() => today.filter((e) => !e.allDay), [today]);
  const next = useMemo(
    () => timed.find((e) => e.end > now && !e.done) ?? null,
    [timed, now],
  );
  const busyMinutes = useMemo(
    () => timed.reduce((sum, e) => sum + Math.max(0, e.end - e.start), 0),
    [timed],
  );
  const left = timed.filter((e) => e.end > now).length;

  const summary =
    today.length === 0
      ? 'Rien de prévu aujourd’hui'
      : `${today.length} ${today.length > 1 ? 'moments' : 'moment'} · ${durationLabel(
          0,
          busyMinutes,
        )} occupées`;

  const nextColor = next ? swatch(next.color) : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset + 30 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{greeting(Math.floor(now / 60))}</Text>
          <Text style={styles.date}>{longDay(new Date())}</Text>
        </View>
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

      {/* la journée d'un coup d'œil */}
      <Animated.View entering={FadeInDown.duration(320)} style={styles.block}>
        <Squish
          style={styles.glance}
          scaleTo={0.985}
          dimTo={1}
          onPress={() => {
            tapSoft();
            onOpenAgenda();
          }}
        >
          <View style={styles.glanceHead}>
            <Text style={styles.glanceTitle}>{summary}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.inkFaint} />
          </View>
          <DayBar events={today} />
        </Squish>
      </Animated.View>

      {/* ce qui arrive */}
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{next ? 'Ensuite' : 'La suite'}</Text>
        {next && nextColor ? (
          <Animated.View entering={FadeInDown.delay(60).duration(320)}>
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
                    {next.allDay
                      ? 'Toute la journée'
                      : `${hhmm(next.start)} – ${hhmm(next.end)}`}
                    {next.location ? ` · ${next.location}` : ''}
                  </Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: nextColor.solid }]}>
                <Text style={styles.badgeText}>{untilLabel(next.start, now)}</Text>
              </View>
            </Squish>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(320)} style={styles.quiet}>
            <Text style={styles.quietText}>
              {today.length === 0
                ? 'La journée est à toi. Rien n’est calé.'
                : 'Tout est passé pour aujourd’hui.'}
            </Text>
            <Squish
              style={[styles.quietBtn, { backgroundColor: ui.accent }]}
              onPress={() => {
                tapSoft();
                onCreateToday();
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.quietBtnText}>Ajouter un moment</Text>
            </Squish>
          </Animated.View>
        )}
      </View>

      {/* la journée en entier */}
      {today.length > 0 && (
        <View style={styles.block}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Ta journée</Text>
            <Squish style={styles.link} onPress={onOpenAgenda}>
              <Text style={[styles.linkText, { color: ui.accent }]}>
                {left > 0 ? `${left} à venir` : 'voir'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={ui.accent} />
            </Squish>
          </View>
          {today.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} onPress={onOpenEvent} onToggle={onToggleEvent} />
          ))}
        </View>
      )}

      {/* la boîte à idées */}
      <View style={styles.block}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>À faire</Text>
          <Squish style={styles.link} onPress={onOpenTodos}>
            <Text style={[styles.linkText, { color: ui.accent }]}>
              {pending.length > 3 ? `les ${pending.length}` : 'tout voir'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={ui.accent} />
          </Squish>
        </View>

        {pending.length === 0 ? (
          <Squish style={styles.emptyTodo} onPress={onOpenTodos}>
            <Text style={styles.emptyTodoText}>
              Rien en attente. Jette une idée ici quand elle passe.
            </Text>
          </Squish>
        ) : (
          pending
            .slice(0, 3)
            .map((t, i) => (
              <TodoCard
                key={t.id}
                todo={t}
                index={i}
                compact
                onPress={onOpenTodo}
                onToggle={onToggleTodo}
                onSchedule={onScheduleTodo}
              />
            ))
        )}
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
  hello: { fontSize: 30, fontWeight: '800', color: theme.ink, letterSpacing: -0.9 },
  date: { fontSize: 14, fontWeight: '600', color: theme.inkFaint, marginTop: 3 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...theme.shadow.soft,
  },
  block: { paddingHorizontal: 18, marginBottom: 22 },
  glance: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: 16,
    ...theme.shadow.soft,
  },
  glanceHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  glanceTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.ink, letterSpacing: -0.35 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  next: { borderRadius: theme.radius.lg, padding: 16, marginTop: 12, gap: 12 },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextEmoji: { fontSize: 26 },
  nextTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  nextTime: { fontSize: 13.5, fontWeight: '600', marginTop: 3, opacity: 0.85 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 13 },
  badgeText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.1 },
  quiet: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: 18,
    marginTop: 12,
    alignItems: 'flex-start',
    gap: 14,
    ...theme.shadow.soft,
  },
  quietText: { fontSize: 14.5, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
  quietBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  quietBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  emptyTodo: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  emptyTodoText: { fontSize: 13.5, fontWeight: '600', color: theme.inkFaint, lineHeight: 19 },
});
