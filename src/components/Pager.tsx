import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';

type Props = {
  count: number;
  index: number;
  width: number;
  onIndexChange: (i: number) => void;
  renderPage: (i: number) => React.ReactNode;
  /** hauteur imposée aux pages (nécessaire quand la page contient un scroll vertical) */
  pageHeight?: number;
  style?: any;
};

/**
 * Pager horizontal « à la iOS » : swipe fluide, page pleine largeur,
 * pilotable de l'extérieur (boutons de navigation, « Aujourd'hui »…).
 */
export function Pager({ count, index, width, onIndexChange, renderPage, pageHeight, style }: Props) {
  const ref = useRef<FlatList<number>>(null);
  const reported = useRef(index);

  useEffect(() => {
    if (reported.current === index) return;
    reported.current = index;
    ref.current?.scrollToOffset({ offset: index * width, animated: true });
  }, [index, width]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (i === reported.current) return;
      reported.current = i;
      onIndexChange(i);
    },
    [onIndexChange, width],
  );

  return (
    <FlatList
      ref={ref}
      style={style}
      data={PAGES(count)}
      keyExtractor={(i) => `p${i}`}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={index}
      decelerationRate="fast"
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      removeClippedSubviews
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onMomentumScrollEnd={onMomentumEnd}
      renderItem={({ item }) => (
        <View style={pageHeight ? { width, height: pageHeight } : { width }}>{renderPage(item)}</View>
      )}
    />
  );
}

const cache = new Map<number, number[]>();
function PAGES(count: number): number[] {
  let arr = cache.get(count);
  if (!arr) {
    arr = Array.from({ length: count }, (_, i) => i);
    cache.set(count, arr);
  }
  return arr;
}
