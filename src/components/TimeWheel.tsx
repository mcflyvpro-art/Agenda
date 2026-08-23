import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Wheel, WheelBand, WHEEL_H } from './Wheel';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => `${n}`.padStart(2, '0');

type Props = { value: number; onChange: (minutes: number) => void };

/** Deux roulettes heures / minutes, comme le picker natif iOS. */
export function TimeWheel({ value, onChange }: Props) {
  const h = Math.floor(value / 60) % 24;
  const m = Math.round((value % 60) / 5) * 5 % 60;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <WheelBand />
        <View style={styles.row}>
        <Wheel
          values={HOURS}
          value={h}
          format={pad}
          onChange={(nh) => onChange(nh * 60 + m)}
        />
        <Text style={styles.colon}>:</Text>
        <Wheel
          values={MINUTES}
          value={m}
          format={pad}
          onChange={(nm) => onChange(h * 60 + nm)}
        />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: WHEEL_H, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 210, height: WHEEL_H, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.inkFaint,
    marginHorizontal: 2,
    marginBottom: 2,
  },
});
