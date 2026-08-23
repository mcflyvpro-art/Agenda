import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** amplitude de l'écrasement au toucher */
  scaleTo?: number;
  dimTo?: number;
};

/** Bouton qui « respire » : ressort doux à l'appui, comme sur iOS. */
export function Squish({ children, style, scaleTo = 0.955, dimTo = 0.9, ...rest }: Props) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(1 - pressed.value * (1 - scaleTo), {
          damping: 18,
          stiffness: 320,
          mass: 0.5,
        }),
      },
    ],
    opacity: withTiming(1 - pressed.value * (1 - dimTo), { duration: 90 }),
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = 1;
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
        rest.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
