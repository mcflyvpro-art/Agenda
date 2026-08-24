import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { hhmm } from '../lib/date';
import { useSettings } from '../store/settings';
import type { AgendaEvent } from '../types';

type Props = {
  events: AgendaEvent[];
  now: number;
  size?: number;
};

const DAY = 1440;

/**
 * Le cadran du jour, en deux anneaux concentriques.
 *
 * L'anneau extérieur, fin, est la journée qui s'écoule : son extrémité
 * arrondie marque l'heure qu'il est. L'anneau intérieur, épais, porte les
 * événements — chacun est un arc à sa place et à sa durée réelles, pas une
 * pastille : on lit d'un coup d'œil où la journée est pleine et où elle
 * respire. Pas de graduations : le cadran se lit par ses proportions.
 */
export function DayRing({ events, now, size = 132 }: Props) {
  const { swatch } = useSettings();

  const c = size / 2;
  const trackStroke = 4.5;
  const eventStroke = 10;
  const rTrack = (size - trackStroke) / 2;
  const rEvent = rTrack - trackStroke / 2 - eventStroke / 2 - 5;

  const circTrack = 2 * Math.PI * rTrack;
  const circEvent = 2 * Math.PI * rEvent;

  // toujours un filet visible, jamais un arc complet à minuit pile
  const progress = Math.max(0.004, Math.min(1, now / DAY));

  /**
   * Un arc trop court devient invisible : on lui garantit une longueur
   * minimale, sinon un rendez-vous d'un quart d'heure disparaît du cadran.
   */
  const arcs = useMemo(() => {
    const minLen = circEvent * 0.018;
    return events
      .filter((e) => !e.allDay && e.end > e.start)
      .map((e) => {
        const startFrac = Math.max(0, Math.min(1, e.start / DAY));
        const rawLen = ((Math.min(DAY, e.end) - e.start) / DAY) * circEvent;
        const len = Math.max(minLen, Math.min(circEvent, rawLen));
        return {
          id: e.id,
          color: swatch(e.color).solid,
          done: e.done,
          len,
          offset: -startFrac * circEvent,
        };
      });
  }, [events, circEvent, swatch]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* la journée, en creux */}
        <Circle
          cx={c}
          cy={c}
          r={rTrack}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={trackStroke}
          fill="none"
        />
        {/* le lit des événements */}
        <Circle
          cx={c}
          cy={c}
          r={rEvent}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={eventStroke}
          fill="none"
        />

        {arcs.map((a) => (
          <Circle
            key={a.id}
            cx={c}
            cy={c}
            r={rEvent}
            stroke={a.color}
            strokeWidth={eventStroke}
            strokeLinecap="butt"
            fill="none"
            opacity={a.done ? 0.4 : 0.95}
            strokeDasharray={`${a.len}, ${circEvent}`}
            strokeDashoffset={a.offset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ))}

        {/* l'heure qu'il est : l'extrémité arrondie de l'arc écoulé */}
        <Circle
          cx={c}
          cy={c}
          r={rTrack}
          stroke="#FFFFFF"
          strokeWidth={trackStroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circTrack * progress}, ${circTrack}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
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
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
});
