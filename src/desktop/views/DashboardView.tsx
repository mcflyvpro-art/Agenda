import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  addDays,
  durationLabel,
  fromKey,
  hhmm,
  longDay,
  minutesNow,
  relativeDayLabel,
  toKey,
  todayKey,
} from '../../lib/date';
import { useSettings } from '../../store/settings';
import { useTodos } from '../../store/todos';
import type { AgendaEvent, Todo } from '../../types';
import { dt } from '../theme';
import { Press } from '../parts/Press';

type Props = {
  eventsOn: (key: string) => AgendaEvent[];
  onSelectEvent: (e: AgendaEvent) => void;
  onSelectDay: (key: string) => void;
  onCreate: (dateKey: string) => void;
  onSchedule: (t: Todo) => void;
  onToggleEvent: (id: string) => void;
};

/** Nombre de jours à venir résumés à droite. */
const AHEAD = 6;

/**
 * Le point du jour.
 *
 * L'équivalent bureau de l'écran d'accueil mobile, mais posé autrement :
 * là-bas tout s'empile et se fait défiler, ici la journée occupe la
 * colonne large et la semaine à venir tient à côté sans qu'on ait à
 * faire un geste. Le but est qu'à l'ouverture de l'ordinateur, une seule
 * image réponde à « qu'est-ce que je fais aujourd'hui, et après ».
 */
export function DashboardView({
  eventsOn,
  onSelectEvent,
  onSelectDay,
  onCreate,
  onSchedule,
  onToggleEvent,
}: Props) {
  const { swatch, ui, settings } = useSettings();
  const { pending } = useTodos();
  const today = todayKey();
  const now = minutesNow();

  const list = eventsOn(today);
  const timed = list.filter((e) => !e.allDay);
  const busy = timed.reduce((n, e) => n + (e.end - e.start), 0);
  const doneCount = list.filter((e) => e.done).length;
  const next = timed.find((e) => e.end > now && !e.done) ?? null;

  const ahead = useMemo(() => {
    const out: { key: string; list: AgendaEvent[] }[] = [];
    for (let i = 1; i <= AHEAD; i++) {
      const key = toKey(addDays(fromKey(today), i));
      out.push({ key, list: eventsOn(key) });
    }
    return out;
  }, [today, eventsOn]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.cols}>
        {/* colonne large : aujourd'hui */}
        <View style={styles.main}>
          <Text style={styles.h1}>{longDay(fromKey(today))}</Text>

          <View style={styles.stats}>
            <Stat value={`${list.length}`} label={list.length > 1 ? 'événements' : 'événement'} />
            <Stat value={busy ? durationLabel(0, busy) : '—'} label="occupé" />
            <Stat value={`${doneCount}/${list.length || 0}`} label="faits" />
            <Stat value={`${pending.length}`} label="idées" />
          </View>

          {next && (
            <Press
              onPress={() => onSelectEvent(next)}
              style={[styles.next, { backgroundColor: swatch(next.color).wash }]}
            >
              <Text style={styles.nextEmoji}>{next.emoji}</Text>
              <View style={styles.flex}>
                <Text style={[styles.nextLabel, { color: swatch(next.color).deep }]}>
                  {next.start > now ? 'Prochainement' : 'En ce moment'}
                </Text>
                <Text numberOfLines={1} style={[styles.nextTitle, { color: swatch(next.color).deep }]}>
                  {next.title}
                </Text>
              </View>
              <Text style={[styles.nextTime, { color: swatch(next.color).deep }]}>
                {hhmm(next.start)} – {hhmm(next.end)}
              </Text>
            </Press>
          )}

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>La journée</Text>
              <Press onPress={() => onCreate(today)} style={styles.cardAction}>
                <Ionicons name="add" size={15} color={ui.accent} />
                <Text style={[styles.cardActionText, { color: ui.accent }]}>Ajouter</Text>
              </Press>
            </View>
            {list.length === 0 ? (
              <Text style={styles.empty}>Journée libre.</Text>
            ) : (
              <View style={styles.rows}>
                {list.map((e) => {
                  const c = swatch(e.color);
                  const past = !e.allDay && e.end <= now;
                  return (
                    <Press
                      key={e.id}
                      onPress={() => onSelectEvent(e)}
                      style={[
                        styles.row,
                        { backgroundColor: c.wash, opacity: e.done || past ? 0.55 : 1 },
                      ]}
                    >
                      <Press
                        onPress={() => onToggleEvent(e.id)}
                        style={styles.check}
                        title="Marquer fait"
                      >
                        <Ionicons
                          name={e.done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={c.solid}
                        />
                      </Press>
                      {settings.showEmoji && <Text style={styles.rowEmoji}>{e.emoji}</Text>}
                      <Text
                        numberOfLines={1}
                        style={[styles.rowTitle, { color: c.deep }, e.done && styles.strike]}
                      >
                        {e.title}
                      </Text>
                      <Text style={[styles.rowTime, { color: c.deep }]}>
                        {e.allDay ? 'Journée' : `${hhmm(e.start)} – ${hhmm(e.end)}`}
                      </Text>
                    </Press>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* colonne étroite : ce qui vient, et les idées */}
        <View style={styles.aside}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Les jours suivants</Text>
            <View style={styles.rows}>
              {ahead.map(({ key, list: l }) => (
                <Press key={key} onPress={() => onSelectDay(key)} style={styles.ahead}>
                  <Text style={styles.aheadDay}>{relativeDayLabel(key)}</Text>
                  {l.length === 0 ? (
                    <Text style={styles.aheadNone}>—</Text>
                  ) : (
                    <View style={styles.dots}>
                      {l.slice(0, 5).map((e) => (
                        <View
                          key={e.id}
                          style={[styles.dot, { backgroundColor: swatch(e.color).solid }]}
                        />
                      ))}
                      {l.length > 5 && <Text style={styles.aheadNone}>{`+${l.length - 5}`}</Text>}
                    </View>
                  )}
                </Press>
              ))}
            </View>
          </View>

          {pending.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{`Idées en attente · ${pending.length}`}</Text>
              <View style={styles.rows}>
                {pending.slice(0, 6).map((t) => (
                  <Press key={t.id} onPress={() => onSchedule(t)} style={styles.idea}>
                    <Text numberOfLines={1} style={styles.ideaText}>
                      {t.title}
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={ui.accent} />
                  </Press>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: dt.gap.lg, paddingBottom: 60 },
  flex: { flex: 1 },
  cols: { flexDirection: 'row', gap: dt.gap.md, alignItems: 'flex-start' },
  main: { flex: 2.1, gap: dt.gap.md, minWidth: 360 },
  aside: { flex: 1, gap: dt.gap.md, minWidth: 230 },
  h1: { fontSize: 24, fontWeight: '800', color: dt.ink, letterSpacing: -0.8 },

  stats: { flexDirection: 'row', gap: dt.gap.sm },
  stat: {
    flex: 1,
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    borderWidth: 1,
    borderColor: dt.line,
  },
  statValue: { fontSize: 21, fontWeight: '800', color: dt.ink, letterSpacing: -0.6 },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: 1 },

  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
  },
  nextEmoji: { fontSize: 22 },
  nextLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.75,
  },
  nextTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  nextTime: { fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },

  card: {
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    gap: 8,
    borderWidth: 1,
    borderColor: dt.line,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 22, borderRadius: dt.radius.xs },
  cardActionText: { fontSize: 11.5, fontWeight: '700' },
  empty: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600', paddingVertical: 4 },

  rows: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: dt.radius.sm,
    paddingLeft: 6,
    paddingRight: 12,
  },
  check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 15 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  strike: { textDecorationLine: 'line-through' },
  rowTime: { fontSize: 11.5, fontWeight: '600', opacity: 0.85, fontVariant: ['tabular-nums'] },

  ahead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    borderRadius: dt.radius.xs,
    paddingHorizontal: 8,
  },
  aheadDay: { fontSize: 12.5, fontWeight: '600', color: dt.ink, textTransform: 'capitalize' },
  aheadNone: { fontSize: 11, fontWeight: '600', color: dt.inkFaint },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    borderRadius: dt.radius.xs,
    paddingHorizontal: 8,
  },
  ideaText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
});
