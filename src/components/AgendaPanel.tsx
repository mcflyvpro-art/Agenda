import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { addDays, fromKey, relativeDayLabel, toKey, todayKey } from '../lib/date';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { EmptyDay } from './EmptyDay';
import { EventCard } from './EventCard';

type Props = {
  fromDate: string;
  byDay: Record<string, AgendaEvent[]>;
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  bottomInset?: number;
  /** horizon de recherche, en jours */
  horizon?: number;
};

/** Liste continue : le jour choisi, puis les suivants qui ont quelque chose. */
export function AgendaPanel({
  fromDate,
  byDay,
  onOpen,
  onToggle,
  bottomInset = 0,
  horizon = 90,
}: Props) {
  const groups = useMemo(() => {
    const start = fromKey(fromDate);
    const out: { key: string; events: AgendaEvent[] }[] = [];
    for (let i = 0; i <= horizon; i++) {
      const key = toKey(addDays(start, i));
      const events = byDay[key] ?? [];
      if (events.length === 0 && i > 0) continue;
      out.push({ key, events });
      if (out.length > 30) break;
    }
    return out;
  }, [fromDate, byDay, horizon]);

  const nothingAhead = groups.every((g) => g.events.length === 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 120 }}
    >
      <Animated.View key={fromDate} entering={FadeIn.duration(280)}>
        {groups.map((g) => (
          <View key={g.key}>
            <View style={styles.header}>
              <Text style={[styles.label, g.key === todayKey() && { color: theme.today }]}>
                {relativeDayLabel(g.key)}
              </Text>
              <View style={styles.rule} />
              <Text style={styles.count}>{g.events.length}</Text>
            </View>
            {g.events.length === 0 ? (
              <EmptyDay label="Rien ce jour-là" />
            ) : (
              g.events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} onPress={onOpen} onToggle={onToggle} />
              ))
            )}
          </View>
        ))}

        {nothingAhead && groups.length <= 1 && (
          <Text style={styles.tail}>Rien de prévu dans les trois prochains mois.</Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 10 },
  label: { fontSize: 14, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  rule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  count: { fontSize: 12, fontWeight: '700', color: theme.inkFaint },
  tail: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.inkFaint,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
