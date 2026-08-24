import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';

const DISTANCE = 44;
const VELOCITY = 520;

type Props = {
  children: React.ReactNode;
  /** −1 pour reculer d'un cran, +1 pour avancer */
  onStep: (delta: number) => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Le bandeau du haut navigue, toujours et dans toutes les vues.
 *
 * C'est le seul geste qui ne rate jamais : partout ailleurs le corps de
 * l'écran peut appartenir aux cartes (glisser pour valider ou supprimer),
 * ici un balayage horizontal fait toujours reculer ou avancer d'un cran.
 * Seuil un peu plus court que celui d'une page, parce qu'on vise une bande
 * étroite et qu'on veut que ça parte du premier coup.
 */
export function NavSwipe({ children, onStep, enabled = true, style }: Props) {
  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onEnd((e) => {
      if (e.translationX <= -DISTANCE || e.velocityX < -VELOCITY) runOnJS(onStep)(1);
      else if (e.translationX >= DISTANCE || e.velocityX > VELOCITY) runOnJS(onStep)(-1);
    });

  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
