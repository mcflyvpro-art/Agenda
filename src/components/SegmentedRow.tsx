import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING } from '../lib/motion';
import { tapLight } from '../lib/haptics';
import { theme } from '../theme';

export type Option<T extends string | number> = { key: T; label: string };

type Props<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 'lg' pour la barre d'échelles en tête d'écran */
  size?: 'md' | 'lg';
};

/** Sélecteur à N choix, pastille glissante — utilisé partout dans les réglages. */
export function SegmentedRow<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: Props<T>) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const seg = w > 0 ? (w - 6) / options.length : 0;

  const pill = useAnimatedStyle(() => ({
    width: seg,
    transform: [{ translateX: withSpring(idx * seg, SPRING.settle) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={[styles.track, size === 'lg' && styles.trackLg]} onLayout={onLayout}>
      {w > 0 && <Animated.View style={[styles.pill, pill]} />}
      {options.map((o) => (
        <Pressable
          key={String(o.key)}
          style={[styles.item, size === 'lg' && styles.itemLg]}
          onPress={() => {
            if (o.key === value) return;
            tapLight();
            onChange(o.key);
          }}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              size === 'lg' && styles.labelLg,
              o.key === value && styles.labelActive,
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(32,32,43,0.05)',
    borderRadius: 14,
    padding: 3,
  },
  pill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 1px rgba(90,76,122,0.06), 0 4px 10px -4px rgba(90,76,122,0.22)',
  } as any,
  trackLg: { borderRadius: 16, backgroundColor: 'rgba(32,32,43,0.055)' },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  itemLg: { paddingVertical: 9 },
  label: { fontSize: 12.5, fontWeight: '700', color: theme.inkSoft, letterSpacing: -0.2 },
  labelLg: { fontSize: 13 },
  labelActive: { color: theme.ink, fontWeight: '800' },
});
