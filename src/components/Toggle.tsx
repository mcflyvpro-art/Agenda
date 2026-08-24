import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { DUR, SPRING } from '../lib/motion';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';

type Props = { value: boolean; onChange: (v: boolean) => void; color?: string };

export function Toggle({ value, onChange, color }: Props) {
  const { ui } = useSettings();
  const on = color ?? ui.accent;
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? on : 'rgba(32,32,43,0.12)', { duration: DUR.quick }),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? 20 : 0, SPRING.press) }],
  }));

  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        tapSoft();
        onChange(!value);
      }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]}>
          <View style={styles.knobInner} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12 },
  knobInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
