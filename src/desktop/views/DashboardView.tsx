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
import { firstUpper } from '../lib/text';
import { alpha, dt } from '../theme';
import { Appear, stagger } from '../parts/Motion';
import { Label, Press } from '../parts/Press';

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
 *
 * L'ordre d'apparition suit cet ordre de lecture — le titre, les quatre
 * compteurs, la prochaine chose, puis la journée — de sorte que la page
 * se construise sous les yeux dans le sens où on la lit.
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
  const nextTint = next ? swatch(next.color) : null;

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
          <Appear delay={stagger(0)}>
            <Text style={styles.h1}>{longDay(fromKey(today))}</Text>
          </Appear>

          <Appear delay={stagger(1)} style={styles.stats}>
            <Stat
              icon="calendar-outline"
              tone={ui.accent}
              value={`${list.length}`}
              label={list.length > 1 ? 'événements' : 'événement'}
            />
            <Stat
              icon="time-outline"
              tone={swatch('sky').solid}
              value={busy ? durationLabel(0, busy) : '—'}
              label="occupé"
            />
            <Stat
              icon="checkmark-done-outline"
              tone={swatch('mint').solid}
              value={`${doneCount}/${list.length || 0}`}
              label="faits"
            />
            <Stat
              icon="sparkles-outline"
              tone={swatch('butter').solid}
              value={`${pending.length}`}
              label="idées"
            />
          </Appear>

          {next && nextTint && (
            <Appear delay={stagger(2)}>
              <Press
                onPress={() => onSelectEvent(next)}
                kind="card"
                style={
                  [
                    styles.next,
                    {
                      backgroundColor: nextTint.wash,
                      boxShadow: `0 1px 2px ${alpha(nextTint.deep, 0.1)}`,
                    },
                  ] as any
                }
                hoverStyle={
                  {
                    transform: [{ translateY: -2 }],
                    boxShadow: `0 4px 8px ${alpha(nextTint.deep, 0.12)}, 0 18px 34px -14px ${alpha(nextTint.deep, 0.42)}`,
                  } as any
                }
              >
                <View style={[styles.nextBar, { backgroundColor: nextTint.solid }]} />
                <View style={[styles.nextEmojiBox, { backgroundColor: alpha(nextTint.solid, 0.2) }]}>
                  <Text style={styles.nextEmoji}>{next.emoji}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.nextLabel, { color: nextTint.deep }]}>
                    {next.start > now ? 'Prochainement' : 'En ce moment'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.nextTitle, { color: nextTint.deep }]}>
                    {next.title}
                  </Text>
                </View>
                <Text style={[styles.nextTime, { color: nextTint.deep }]}>
                  {hhmm(next.start)} – {hhmm(next.end)}
                </Text>
              </Press>
            </Appear>
          )}

          <Appear delay={stagger(3)} style={styles.card}>
            <View style={styles.cardHead}>
              <Label>La journée</Label>
              <Press
                onPress={() => onCreate(today)}
                style={styles.cardAction}
                hoverStyle={{ backgroundColor: alpha(ui.accent, 0.12) }}
              >
                <Ionicons name="add" size={14} color={ui.accent} />
                <Text style={[styles.cardActionText, { color: ui.accent }]}>Ajouter</Text>
              </Press>
            </View>
            {list.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="leaf-outline" size={18} color={dt.inkFaint} />
                <Text style={styles.empty}>Journée libre.</Text>
              </View>
            ) : (
              <View style={styles.rows}>
                {list.map((e) => {
                  const c = swatch(e.color);
                  const past = !e.allDay && e.end <= now;
                  return (
                    <Press
                      key={e.id}
                      onPress={() => onSelectEvent(e)}
                      kind="event"
                      style={[
                        styles.row,
                        { backgroundColor: c.wash, opacity: e.done || past ? 0.52 : 1 },
                      ]}
                      hoverStyle={{ backgroundColor: alpha(c.solid, 0.22) }}
                    >
                      <View style={[styles.rowBar, { backgroundColor: c.solid }]} />
                      <Press
                        onPress={() => onToggleEvent(e.id)}
                        style={styles.check}
                        title="Marquer fait"
                        sink
                      >
                        <Ionicons
                          name={e.done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={17}
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
          </Appear>
        </View>

        {/* colonne étroite : ce qui vient, et les idées */}
        <View style={styles.aside}>
          <Appear delay={stagger(2)} style={styles.card}>
            <Label>Les jours suivants</Label>
            <View style={styles.rows}>
              {ahead.map(({ key, list: l }) => (
                <Press key={key} onPress={() => onSelectDay(key)} style={styles.ahead}>
                  <Text style={styles.aheadDay}>{firstUpper(relativeDayLabel(key))}</Text>
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
          </Appear>

          {pending.length > 0 && (
            <Appear delay={stagger(3)} style={styles.card}>
              <Label>{`Idées en attente · ${pending.length}`}</Label>
              <View style={styles.rows}>
                {pending.slice(0, 6).map((t) => (
                  <Press
                    key={t.id}
                    onPress={() => onSchedule(t)}
                    style={styles.idea}
                    title="Placer dans l'agenda"
                  >
                    <View style={[styles.ideaDot, { backgroundColor: alpha(ui.accent, 0.4) }]} />
                    <Text numberOfLines={1} style={styles.ideaText}>
                      {t.title}
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={ui.accent} />
                  </Press>
                ))}
              </View>
            </Appear>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Un compteur.
 *
 * La pastille colorée n'est pas décorative : quatre chiffres alignés dans
 * quatre boîtes identiques se confondent, alors qu'une teinte et une
 * icône par compteur les rendent reconnaissables du coin de l'œil, sans
 * avoir à relire l'intitulé.
 */
function Stat({
  icon,
  tone,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: alpha(tone, 0.14) }]}>
        <Ionicons name={icon} size={14} color={tone} />
      </View>
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
  aside: { flex: 1, gap: dt.gap.md, minWidth: 234 },
  h1: { fontSize: 25, fontWeight: '800', color: dt.ink, letterSpacing: -0.9 },

  stats: { flexDirection: 'row', gap: dt.gap.sm },
  stat: {
    flex: 1,
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    borderWidth: 1,
    borderColor: dt.line,
    gap: 2,
    ...dt.shadow.flat,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: dt.ink,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint },

  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: dt.radius.md,
    paddingLeft: 18,
    paddingRight: dt.gap.md,
    paddingVertical: dt.gap.md,
    overflow: 'hidden',
  },
  nextBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  nextEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEmoji: { fontSize: 20 },
  nextLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    opacity: 0.7,
  },
  nextTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.4, marginTop: 1 },
  nextTime: { fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },

  card: {
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    gap: 9,
    borderWidth: 1,
    borderColor: dt.line,
    ...dt.shadow.flat,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    height: 23,
    borderRadius: dt.radius.xs,
  },
  cardActionText: { fontSize: 11.5, fontWeight: '700' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  empty: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600' },

  rows: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: dt.radius.sm,
    paddingLeft: 10,
    paddingRight: 13,
    overflow: 'hidden',
  },
  rowBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  check: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 15 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  strike: { textDecorationLine: 'line-through' },
  rowTime: { fontSize: 11.5, fontWeight: '600', opacity: 0.85, fontVariant: ['tabular-nums'] },

  ahead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 31,
    borderRadius: dt.radius.xs,
    paddingHorizontal: 9,
  },
  aheadDay: { fontSize: 12.5, fontWeight: '600', color: dt.ink },
  aheadNone: { fontSize: 11, fontWeight: '600', color: dt.inkFaint },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 31,
    borderRadius: dt.radius.xs,
    paddingHorizontal: 9,
  },
  ideaDot: { width: 5, height: 5, borderRadius: 3 },
  ideaText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
});
