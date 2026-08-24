import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT, SPRING } from '../lib/motion';
import { isPagerGestureActive } from './Pager';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** amplitude de l'écrasement au toucher */
  scaleTo?: number;
  dimTo?: number;
};

/**
 * Bouton qui « respire » : l'appui l'enfonce à peine, le relâchement le
 * repose. Volontairement discret — on doit sentir que ça répond, pas voir
 * le bouton bouger.
 *
 * L'animation est portée par la valeur partagée, pas recalculée à chaque
 * frame dans le style — c'est ce qui la rend stable quand la liste se
 * réordonne.
 */
export function Squish({ children, style, scaleTo = 0.97, dimTo = 0.94, ...rest }: Props) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, dimTo]),
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = withSpring(1, SPRING.press);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: DUR.quick, easing: EASE_OUT });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        // rempart applicatif : un balayage de page en cours (ou tout juste
        // fini) ne doit jamais laisser passer le tap fantôme du relâchement.
        if (isPagerGestureActive()) return;
        rest.onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
