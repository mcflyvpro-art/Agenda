import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hhmm, minutesNow } from '../lib/date';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';

type Props = {
  events: AgendaEvent[];
  /** afficher le repère de l'heure courante */
  live?: boolean;
};

/**
 * La journée ramassée en une barre : où sont les blocs, où sont les trous.
 * On la lit d'un coup d'œil, sans faire défiler quoi que ce soit.
 */
export function DayBar({ events, live = true }: Props) {
  const { swatch, ui } = useSettings();

  const timed = useMemo(
    () => events.filter((e) => !e.allDay).sort((a, b) => a.start - b.start),
    [events],
  );

  const [from, to] = useMemo(() => {
    if (timed.length === 0) return [8 * 60, 22 * 60];
    const first = Math.min(...timed.map((e) => e.start));
    const last = Math.max(...timed.map((e) => e.end));
    return [Math.min(8 * 60, Math.floor(first / 60) * 60), Math.max(22 * 60, Math.ceil(last / 60) * 60)];
  }, [timed]);

  const span = Math.max(60, to - from);
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m - from) / span) * 100))}%`;
  const now = minutesNow();
  const showNow = live && now >= from && now <= to;

  // trois repères horaires, arrondis à l'heure
  const ticks = [from, from + span / 2, to].map((m) => Math.round(m / 60) * 60);

  return (
    <View>
      <View style={styles.track}>
        {timed.map((e) => {
          const c = swatch(e.color);
          const left = pct(e.start);
          const width = `${Math.max(2.5, ((Math.max(e.end, e.start + 20) - e.start) / span) * 100)}%`;
          return (
            <View
              key={e.id}
              style={[
                styles.block,
                { left: left as any, width: width as any, backgroundColor: c.solid },
                e.done && { opacity: 0.4 },
              ]}
            />
          );
        })}

        {showNow && (
          <View style={[styles.now, { left: pct(now) as any }]}>
            <View style={[styles.nowLine, { backgroundColor: theme.ink }]} />
            <View style={[styles.nowDot, { backgroundColor: theme.ink }]} />
          </View>
        )}
      </View>

      <View style={styles.ticks}>
        {ticks.map((m, i) => (
          <Text key={i} style={[styles.tick, i === 1 && styles.tickMid, i === 2 && styles.tickEnd]}>
            {hhmm(m)}
          </Text>
        ))}
      </View>

      {timed.length === 0 && (
        <Text style={[styles.free, { color: ui.accent }]}>journée entièrement libre</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(32,32,43,0.055)',
    overflow: 'visible',
  },
  block: { position: 'absolute', top: 4, bottom: 4, borderRadius: 9, minWidth: 6 },
  now: { position: 'absolute', top: -3, bottom: -3, width: 2, alignItems: 'center' },
  nowLine: { flex: 1, width: 2, borderRadius: 1 },
  nowDot: { position: 'absolute', top: -3, width: 6, height: 6, borderRadius: 3 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tick: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.inkFaint,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  tickMid: { textAlign: 'center' },
  tickEnd: { textAlign: 'right' },
  free: { fontSize: 12.5, fontWeight: '700', marginTop: 8, letterSpacing: -0.1 },
});
