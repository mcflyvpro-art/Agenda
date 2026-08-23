import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
// Le Pressable de gesture-handler (pas celui de react-native) : construit sur
// le même système de gestes que le Pager et les lignes glissables (SwipeRow),
// il sait céder correctement la main quand un geste parent (un swipe de page)
// est en train de capturer le toucher — sans ça, relâcher le doigt après un
// balayage peut aussi déclencher le tap qu'il y a en dessous.
import { Pressable, PressableProps } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
 * Bouton qui « respire » : ressort doux à l'appui.
 * L'animation est portée par la valeur partagée, pas recalculée à chaque frame
 * dans le style — c'est ce qui la rend stable quand la liste se réordonne.
 */
export function Squish({ children, style, scaleTo = 0.955, dimTo = 0.9, ...rest }: Props) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, dimTo]),
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.4 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: 160 });
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
