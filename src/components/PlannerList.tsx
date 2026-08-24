import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DUR } from '../lib/motion';
import { fromKey, monthYearTitle, relativeDayLabel, todayKey } from '../lib/date';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { EmptyDay } from './EmptyDay';
import { EventCard } from './EventCard';

type Props = {
  /** les jours à afficher, dans l'ordre */
  days: string[];
  byDay: Record<string, AgendaEvent[]>;
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  bottomInset?: number;
  /** garder les jours vides (vue semaine) ou les sauter (planning) */
  keepEmpty?: boolean;
  /** intercaler un titre quand on change de mois */
  monthHeaders?: boolean;
};

/** Une liste de jours enchaînés — la vue Planning, et la semaine en liste. */
export function PlannerList({
  days,
  byDay,
  onOpen,
  onToggle,
  onRemove,
  bottomInset = 0,
  keepEmpty = false,
  monthHeaders = false,
}: Props) {
  const { ui } = useSettings();

  const groups = useMemo(() => {
    const out: { key: string; events: AgendaEvent[]; month?: string }[] = [];
    let lastMonth = '';
    for (const key of days) {
      const events = byDay[key] ?? [];
      if (!keepEmpty && events.length === 0) continue;
      const monthLabel = monthYearTitle(fromKey(key));
      const showMonth = monthHeaders && monthLabel !== lastMonth;
      lastMonth = monthLabel;
      out.push({ key, events, month: showMonth ? monthLabel : undefined });
    }
    return out;
  }, [days, byDay, keepEmpty, monthHeaders]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 120 }}
    >
      {groups.length === 0 ? (
        <EmptyDay />
      ) : (
        groups.map((g) => (
          <View key={g.key}>
            {!!g.month && <Text style={styles.month}>{g.month}</Text>}
            <View style={[styles.header, g.events.length === 0 && styles.headerEmpty]}>
              <Text
                style={[
                  styles.label,
                  g.events.length === 0 && styles.labelEmpty,
                  g.key === todayKey() && { color: ui.today },
                ]}
              >
                {relativeDayLabel(g.key)}
              </Text>
              <View style={styles.rule} />
              <Text style={styles.count}>{g.events.length > 0 ? g.events.length : '·'}</Text>
            </View>
            {g.events.map((e, i) => (
              <EventCard
                key={e.id}
                event={e}
                index={i}
                onPress={onOpen}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

/** Enveloppe animée : on ne rejoue l'apparition que si la liste change vraiment. */
export function PlannerFade({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Animated.View key={id} entering={FadeIn.duration(DUR.quick)} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  month: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.ink,
    letterSpacing: -0.5,
    paddingTop: 18,
    paddingBottom: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 10 },
  headerEmpty: { paddingTop: 6, paddingBottom: 6 },
  label: { fontSize: 14, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  labelEmpty: { fontWeight: '600', color: theme.inkFaint },
  rule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  count: { fontSize: 12, fontWeight: '700', color: theme.inkFaint },
});
