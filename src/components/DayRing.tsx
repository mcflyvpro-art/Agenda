import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { hhmm } from '../lib/date';
import { useSettings } from '../store/settings';
import type { AgendaEvent } from '../types';

type Props = {
  events: AgendaEvent[];
  now: number;
  size?: number;
};

/**
 * L'anneau du jour : l'arc plein montre où on en est entre minuit et minuit,
 * chaque point marque un événement à l'heure où il tombe sur le cadran,
 * et le centre affiche l'heure qui tourne.
 */
export function DayRing({ events, now, size = 124 }: Props) {
  const { swatch } = useSettings();
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0.006, Math.min(1, now / 1440));

  const timed = events.filter((e) => !e.allDay);

  const onRing = (minutes: number, radius: number) => {
    const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
    return { x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) };
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(255,255,255,0.26)" strokeWidth={stroke} fill="none" />
        {[0, 6, 12, 18].map((h) => {
          const inner = onRing(h * 60, r - stroke / 2 - 2);
          const outer = onRing(h * 60, r + stroke / 2 + 2);
          return (
            <Line
              key={h}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
            />
          );
        })}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        {timed.map((e) => {
          const p = onRing(e.start, r);
          return (
            <Circle
              key={e.id}
              cx={p.x}
              cy={p.y}
              r={4.5}
              fill={swatch(e.color).solid}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              opacity={e.done ? 0.45 : 1}
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.clock}>{hhmm(now)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clock: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
});
