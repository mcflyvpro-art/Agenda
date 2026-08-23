import React from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { tapSoft } from '../lib/haptics';
import { theme } from '../theme';
import type { ViewMode } from '../types';

type Props = { mode: ViewMode; onChange: (m: ViewMode) => void };

const ITEMS: { key: ViewMode; label: string }[] = [
  { key: 'month', label: 'Mois' },
  { key: 'day', label: 'Jour' },
];

/** Segmented control façon iOS, avec la pastille qui glisse. */
export function ModeSwitch({ mode, onChange }: Props) {
  const [w, setW] = React.useState(0);
  const idx = ITEMS.findIndex((i) => i.key === mode);
  const seg = w > 0 ? (w - 6) / ITEMS.length : 0;

  const pill = useAnimatedStyle(() => ({
    width: seg,
    transform: [{ translateX: withSpring(idx * seg, { damping: 20, stiffness: 240 }) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={styles.track} onLayout={onLayout}>
      {w > 0 && <Animated.View style={[styles.pill, pill]} />}
      {ITEMS.map((it) => (
        <Pressable
          key={it.key}
          style={styles.item}
          onPress={() => {
            if (it.key === mode) return;
            tapSoft();
            onChange(it.key);
          }}
        >
          <Text style={[styles.label, it.key === mode && styles.labelActive]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(32,32,43,0.055)',
    borderRadius: 15,
    padding: 3,
    width: 132,
  },
  pill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5A4C7A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  label: { fontSize: 13.5, fontWeight: '700', color: theme.inkSoft, letterSpacing: -0.2 },
  labelActive: { color: theme.ink },
});
