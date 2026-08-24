import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCROLL_IN_PAGER } from '../lib/gestures';
import { durationLabel, hhmm, minutesNow, todayKey } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { EmptyDay } from './EmptyDay';
import { Squish } from './Squish';

type Props = {
  dateKey: string;
  events: AgendaEvent[];
  onCreateAt: (minutes: number) => void;
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  bottomInset?: number;
};

type Row =
  | { kind: 'event'; event: AgendaEvent }
  | { kind: 'gap'; from: number; to: number };

/**
 * Chronologie condensée : les heures creuses se replient en un simple
 * intervalle « 2 h de libre », qu'on peut toucher pour y caser quelque chose.
 */
export function DayRail({ dateKey, events, onCreateAt, onOpen, onToggle, bottomInset = 0 }: Props) {
  const { settings, swatch } = useSettings();
  const allDay = events.filter((e) => e.allDay);
  const timed = useMemo(
    () => events.filter((e) => !e.allDay).sort((a, b) => a.start - b.start),
    [events],
  );

  const rows = useMemo(() => {
    const out: Row[] = [];
    let cursor = -1;
    for (const event of timed) {
      if (cursor >= 0 && event.start - cursor >= 45) {
        out.push({ kind: 'gap', from: cursor, to: event.start });
      }
      out.push({ kind: 'event', event });
      cursor = Math.max(cursor, event.end);
    }
    return out;
  }, [timed]);

  const isToday = dateKey === todayKey();
  const now = minutesNow();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={SCROLL_IN_PAGER}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 130, paddingTop: 6 }}
    >
      {allDay.map((e, i) => {
        const c = swatch(e.color);
        return (
          <View key={e.id}>
            <Squish
              onPress={() => {
                tapSoft();
                onOpen(e);
              }}
              style={[styles.allDay, { backgroundColor: c.wash }]}
            >
              {settings.showEmoji && <Text style={styles.emoji}>{e.emoji}</Text>}
              <Text numberOfLines={1} style={[styles.allDayText, { color: c.deep }]}>
                {e.title}
              </Text>
              <Ionicons name="sunny" size={14} color={c.deep} />
            </Squish>
          </View>
        );
      })}

      {rows.length === 0 && allDay.length === 0 && <EmptyDay />}

      {rows.map((row, i) => {
        if (row.kind === 'gap') {
          return (
            <Squish
              key={`gap-${row.from}-${row.to}`}
              style={styles.gapRow}
              scaleTo={0.99}
              dimTo={0.7}
              onPress={() => {
                tapLight();
                onCreateAt(row.from);
              }}
            >
              <View style={styles.gapRail}>
                <View style={styles.dashed} />
              </View>
              <Text style={styles.gapText}>{durationLabel(row.from, row.to)}</Text>
              <Ionicons name="add" size={14} color={theme.inkFaint} />
            </Squish>
          );
        }

        const e = row.event;
        const c = swatch(e.color);
        const running = isToday && now >= e.start && now < e.end;
        const past = isToday && now >= e.end;
        return (
          <View key={e.id} style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeStart, past && { color: theme.inkFaint }]}>
                {hhmm(e.start)}
              </Text>
              <Text style={styles.timeEnd}>{hhmm(e.end)}</Text>
            </View>

            <View style={styles.rail}>
              <View
                style={[
                  styles.railDot,
                  { backgroundColor: c.solid },
                  running && styles.railDotLive,
                ]}
              />
              <View style={[styles.railLine, { backgroundColor: c.solid, opacity: 0.25 }]} />
            </View>

            <Squish
              onPress={() => {
                tapSoft();
                onOpen(e);
              }}
              onLongPress={() => {
                tapLight();
                onToggle(e.id);
              }}
              delayLongPress={280}
              style={[
                styles.card,
                { backgroundColor: c.wash, opacity: e.done ? 0.55 : past ? 0.8 : 1 },
              ]}
            >
              <View style={styles.cardHead}>
                {settings.showEmoji && <Text style={styles.emoji}>{e.emoji}</Text>}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.cardTitle,
                    { color: c.deep },
                    e.done && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {e.title}
                </Text>
                {running && <View style={[styles.livePulse, { backgroundColor: c.solid }]} />}
              </View>
              {settings.detail !== 'minimal' && (
                <Text style={[styles.cardMeta, { color: c.deep }]}>
                  {durationLabel(e.start, e.end)}
                  {settings.detail === 'full' && e.location ? ` · ${e.location}` : ''}
                </Text>
              )}
              {settings.detail === 'full' && !!e.notes && (
                <Text numberOfLines={2} style={[styles.cardNotes, { color: c.deep }]}>
                  {e.notes}
                </Text>
              )}
            </Squish>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  allDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    marginBottom: 10,
  },
  allDayText: { flex: 1, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  allDayTag: { fontSize: 11, fontWeight: '700', opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  timeCol: { width: 46, paddingTop: 12, alignItems: 'flex-end', paddingRight: 8 },
  timeStart: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.ink,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  rail: { width: 18, alignItems: 'center', paddingTop: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5 },
  railDotLive: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  railLine: { flex: 1, width: 2, borderRadius: 1, marginTop: 3 },
  card: { flex: 1, borderRadius: theme.radius.lg, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  emoji: { fontSize: 15 },
  cardTitle: { flex: 1, fontSize: 15.5, fontWeight: '700', letterSpacing: -0.3 },
  cardMeta: { fontSize: 12.5, fontWeight: '600', opacity: 0.8, marginTop: 3 },
  cardNotes: { fontSize: 12.5, fontWeight: '500', opacity: 0.7, marginTop: 4, lineHeight: 17 },
  livePulse: { width: 8, height: 8, borderRadius: 4 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6, marginBottom: 10 },
  gapRail: { width: 64, alignItems: 'flex-end', paddingRight: 7 },
  dashed: {
    width: 2,
    height: 22,
    borderRadius: 1,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.hairlineStrong,
  },
  gapText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: theme.inkFaint, letterSpacing: -0.1 },
});
