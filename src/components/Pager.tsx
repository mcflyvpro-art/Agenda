import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT, SPRING } from '../lib/motion';

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

/** distance ou vitesse à partir de laquelle un glissement valide le changement de page */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 700;

// Un seul Pager actif à la fois dans l'appli : un simple drapeau de module
// suffit donc à prévenir les zones tactiles (Squish, cases de la timeline)
// qu'un balayage est en cours, pour qu'elles ignorent le tap fantôme que le
// relâchement du doigt peut déclencher juste après (surtout sur le web, où
// la souris synthétique n'annule pas toujours proprement le clic sous-jacent).
let pagerGestureActive = false;
function setPagerGestureActive(v: boolean) {
  pagerGestureActive = v;
}
function clearGestureActiveSoon(delay: number) {
  setTimeout(() => setPagerGestureActive(false), delay);
}
/** À vérifier en tête d'un handler de tap qui partage l'écran avec un Pager. */
export function isPagerGestureActive() {
  return pagerGestureActive;
}

/**
 * Pager horizontal maison. Le scroll natif à pagination peut « rouler »
 * sur plusieurs pages d'un coup lors d'un balayage rapide ou ample, selon
 * la plateforme (Android, web) — ici c'est impossible par construction :
 * le glissement est borné à une largeur de page, et chaque geste ne peut
 * jamais faire avancer ou reculer que d'un seul cran.
 */
export function Pager({ count, index, width, onIndexChange, renderPage, pageHeight, style }: Props) {
  const dragX = useSharedValue(0);
  const startX = useSharedValue(0);
  const busy = useSharedValue(false);

  // un changement d'index venu d'ailleurs (bouton, sélection, création…) : on se recentre net
  useEffect(() => {
    dragX.value = 0;
  }, [index]);

  const hasPrev = index > 0;
  const hasNext = index < count - 1;

  const pan = Gesture.Pan()
    .enabled(count > 1)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onStart(() => {
      startX.value = dragX.value;
      runOnJS(setPagerGestureActive)(true);
    })
    .onUpdate((e) => {
      if (busy.value) return;
      const raw = startX.value + e.translationX;
      const min = hasNext ? -width : 0;
      const max = hasPrev ? width : 0;
      dragX.value = Math.min(max, Math.max(min, raw));
    })
    .onEnd((e) => {
      // le tap fantôme survient juste après le relâchement : on laisse un
      // court sursis après la fin de l'animation avant de rouvrir le geste
      // aux zones tactiles sous-jacentes.
      runOnJS(clearGestureActiveSoon)(300);
      if (busy.value) return;
      const goNext = hasNext && (dragX.value < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY);
      const goPrev =
        !goNext && hasPrev && (dragX.value > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY);

      if (goNext) {
        busy.value = true;
        dragX.value = withTiming(-width, { duration: DUR.quick, easing: EASE_OUT }, (done) => {
          if (done) {
            dragX.value = 0;
            busy.value = false;
            runOnJS(onIndexChange)(index + 1);
          }
        });
      } else if (goPrev) {
        busy.value = true;
        dragX.value = withTiming(width, { duration: DUR.quick, easing: EASE_OUT }, (done) => {
          if (done) {
            dragX.value = 0;
            busy.value = false;
            runOnJS(onIndexChange)(index - 1);
          }
        });
      } else {
        dragX.value = withSpring(0, SPRING.settle);
      }
    });

  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + dragX.value }],
  }));
  const curStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));
  const nextStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width + dragX.value }],
  }));

  const slotSize = pageHeight ? { width, height: pageHeight } : { width, height: '100%' as const };

  return (
    // touchAction="pan-y" (web) : par défaut, un GestureDetector coupe tout
    // défilement natif dans toute sa sous-arborescence — même celui d'un
    // ScrollView vertical bien à l'intérieur d'une page. En autorisant
    // explicitement le pan vertical natif, on laisse le navigateur défiler
    // normalement (y compris quand le doigt part d'un bouton) tout en
    // réservant le mouvement horizontal à ce geste, pour le changement de
    // page.
    <GestureDetector gesture={pan} touchAction="pan-y">
      <View style={[styles.clip, pageHeight ? { height: pageHeight } : { height: '100%' }, style]}>
        {hasPrev && (
          <Animated.View style={[styles.slot, slotSize, prevStyle]}>
            {renderPage(index - 1)}
          </Animated.View>
        )}
        <Animated.View style={[styles.slot, slotSize, curStyle]}>
          {renderPage(index)}
        </Animated.View>
        {hasNext && (
          <Animated.View style={[styles.slot, slotSize, nextStyle]}>
            {renderPage(index + 1)}
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', width: '100%' },
  slot: { position: 'absolute', top: 0, left: 0 },
});
