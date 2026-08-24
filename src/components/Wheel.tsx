import React, { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { tapLight } from '../lib/haptics';
import { theme } from '../theme';

export const ITEM_H = 42;
const VISIBLE = 5;
export const WHEEL_H = ITEM_H * VISIBLE;

/** délai sans nouvel événement de défilement au bout duquel on considère la roulette posée */
const SETTLE_MS = 130;

/*
  Sur le web, react-native-web ne sait pas accrocher au cran : `snapToInterval`
  n'y est tout simplement pas implémenté. On le refait en CSS — le décalage
  du haut compense les deux items de rembourrage, si bien qu'un cran accroché
  tombe pile dans la bande de sélection.
*/
const SNAP_SCROLLER: StyleProp<ViewStyle> =
  Platform.OS === 'web'
    ? ({ scrollSnapType: 'y mandatory', scrollPaddingTop: ITEM_H * 2 } as ViewStyle)
    : null;
const SNAP_ITEM: StyleProp<ViewStyle> =
  Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as ViewStyle) : null;

function WheelItem({
  label,
  index,
  offset,
}: {
  label: string;
  index: number;
  offset: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(offset.value / ITEM_H - index);
    return {
      opacity: interpolate(d, [0, 1, 2, 3], [1, 0.5, 0.24, 0.1], 'clamp'),
      transform: [
        { scale: interpolate(d, [0, 1, 2], [1, 0.86, 0.74], 'clamp') },
        { rotateX: `${interpolate(d, [0, 2], [0, 42], 'clamp')}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.item, SNAP_ITEM, style]}>
      <Text style={styles.itemText}>{label}</Text>
    </Animated.View>
  );
}

type Props = {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  width?: number;
};

/**
 * Roulette iOS : accroche au cran, items qui s'estompent en s'éloignant.
 *
 * La valeur est validée quand la roulette s'immobilise, repérée au silence
 * après le dernier événement de défilement. C'est le seul signal fiable
 * partout : sur le web, `onMomentumScrollEnd` et `onScrollEndDrag` ne sont
 * jamais émis, si bien qu'une roulette qui s'y fierait tournerait sans
 * jamais rien changer.
 */
export function Wheel({ values, value, onChange, format, width = 78 }: Props) {
  const ref = useRef<ScrollView>(null);
  const offset = useSharedValue(0);
  const current = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const indexOf = useCallback(
    (v: number) => {
      const i = values.indexOf(v);
      if (i >= 0) return i;
      // valeur hors crans : on prend le plus proche
      let best = 0;
      let bestD = Infinity;
      values.forEach((x, k) => {
        const d = Math.abs(x - v);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      return best;
    },
    [values],
  );

  useEffect(() => {
    if (current.current === value) return;
    current.current = value;
    const y = indexOf(value) * ITEM_H;
    offset.value = y;
    ref.current?.scrollTo({ y, animated: true });
  }, [value, indexOf, offset]);

  useEffect(() => {
    const y = indexOf(current.current) * ITEM_H;
    offset.value = y;
    const t = setTimeout(() => ref.current?.scrollTo({ y, animated: false }), 20);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = useCallback(
    (y: number) => {
      const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)));
      const v = values[i];
      if (v === current.current) return;
      current.current = v;
      tapLight();
      onChange(v);
    },
    [values, onChange],
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    offset.value = y;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(y), SETTLE_MS);
  };

  return (
    <View style={{ width, height: WHEEL_H }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={SNAP_SCROLLER}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {values.map((v, i) => (
          <WheelItem key={v} label={format(v)} index={i} offset={offset} />
        ))}
      </ScrollView>
    </View>
  );
}

export function WheelBand() {
  return <View style={styles.band} />;
}

const styles = StyleSheet.create({
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.ink,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  band: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 12,
    right: 12,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderRadius: 14,
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
});
