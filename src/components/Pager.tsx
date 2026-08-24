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
  /**
   * Balayage horizontal sur le corps de la page. À couper dans les vues en
   * liste, où les cartes occupent tout l'écran et où le glissement leur
   * appartient (valider / supprimer) : on y navigue par le bandeau du haut.
   */
  swipeable?: boolean;
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
 * Pager horizontal maison.
 *
 * Chaque page est posée à sa place absolue — la page `i` est toujours à
 * `i × largeur` — et c'est le rail entier qui coulisse devant. Rien ne se
 * repositionne quand l'index change : les pages déjà montées ne bougent
 * pas d'un pixel, seules celles des bords apparaissent ou disparaissent,
 * hors écran.
 *
 * C'est ce qui supprime le clignotement. Avec des pages placées les unes
 * par rapport à l'autre, la fin du glissement devait remettre la position
 * à zéro sur le fil d'animation puis prévenir React : entre les deux, une
 * image entière montrait encore la veille. Ici les deux informations ne
 * peuvent plus se contredire, puisqu'une seule pilote l'affichage.
 *
 * Le glissement est par ailleurs borné à une largeur de page : un balayage,
 * même violent, ne peut jamais faire défiler plusieurs jours d'un coup.
 */
export function Pager({
  count,
  index,
  width,
  onIndexChange,
  renderPage,
  pageHeight,
  swipeable = true,
  style,
}: Props) {
  // position du rail : au repos, exactement `-index × largeur`
  const trackX = useSharedValue(-index * width);
  const startX = useSharedValue(0);
  const busy = useSharedValue(false);

  /*
    Un index venu d'ailleurs (bouton « aujourd'hui », sélection d'un jour,
    création…) demande un recalage net. À l'inverse, l'index qui arrive
    juste après un balayage correspond déjà à la position atteinte : on n'y
    touche pas, sans quoi on réécrirait la même valeur pour rien.
  */
  useEffect(() => {
    const target = -index * width;
    if (Math.abs(trackX.value - target) > 0.5) trackX.value = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  const hasPrev = index > 0;
  const hasNext = index < count - 1;

  const pan = Gesture.Pan()
    .enabled(swipeable && count > 1)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onStart(() => {
      startX.value = trackX.value;
      runOnJS(setPagerGestureActive)(true);
    })
    .onUpdate((e) => {
      if (busy.value) return;
      const base = -index * width;
      // jamais plus d'une page de part et d'autre, et rien au-delà des bords
      const min = hasNext ? base - width : base;
      const max = hasPrev ? base + width : base;
      trackX.value = Math.min(max, Math.max(min, startX.value + e.translationX));
    })
    .onEnd((e) => {
      // le tap fantôme survient juste après le relâchement : on laisse un
      // court sursis avant de rouvrir le geste aux zones tactiles dessous
      runOnJS(clearGestureActiveSoon)(300);
      if (busy.value) return;

      const base = -index * width;
      const moved = trackX.value - base;
      const goNext = hasNext && (moved < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY);
      const goPrev =
        !goNext && hasPrev && (moved > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY);
      const target = goNext ? index + 1 : goPrev ? index - 1 : index;

      if (target === index) {
        // rien n'est validé : on revient se poser sur la page courante
        trackX.value = withSpring(base, SPRING.settle);
        return;
      }

      busy.value = true;
      trackX.value = withTiming(
        -target * width,
        { duration: DUR.quick, easing: EASE_OUT },
        (done) => {
          if (done) {
            busy.value = false;
            runOnJS(onIndexChange)(target);
          }
        },
      );
    });

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: trackX.value }] }));

  const slotSize = pageHeight ? { width, height: pageHeight } : { width, height: '100%' as const };

  const pages = [];
  for (let i = index - 1; i <= index + 1; i++) {
    if (i < 0 || i >= count) continue;
    pages.push(
      <View key={i} style={[styles.slot, slotSize, { left: i * width }]}>
        {renderPage(i)}
      </View>,
    );
  }

  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
      <View style={[styles.clip, pageHeight ? { height: pageHeight } : { height: '100%' }, style]}>
        <Animated.View style={[styles.track, trackStyle]}>{pages}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', width: '100%' },
  // le rail n'a pas de dimensions propres : il ne sert qu'à porter le
  // déplacement commun des pages, posées en absolu à leur place
  track: { position: 'absolute', top: 0, left: 0, height: '100%' },
  slot: { position: 'absolute', top: 0 },
});
