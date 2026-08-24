import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { notifyWarn, tapLight, tapMedium } from '../lib/haptics';

const THRESHOLD = 78;

type Props = {
  children: React.ReactNode;
  /** glisser vers la droite */
  onRight?: () => void;
  /** glisser vers la gauche */
  onLeft?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightColor?: string;
  leftColor?: string;
  radius?: number;
  disabled?: boolean;
};

/**
 * Une ligne qui répond au doigt : on la pousse à droite pour la valider,
 * à gauche pour la faire disparaître. Un tap l'ouvre, deux taps la placent.
 */
export function SwipeRow({
  children,
  onRight,
  onLeft,
  onTap,
  onDoubleTap,
  rightIcon = 'checkmark',
  leftIcon = 'trash-outline',
  rightColor = '#10BC6C',
  leftColor = '#EF4377',
  radius = 26,
  disabled,
}: Props) {
  const x = useSharedValue(0);
  const armed = useSharedValue(0);
  const pressed = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const raw = e.translationX;
      // on freine dans la direction qui n'a pas d'action
      const allowed = (raw > 0 && onRight) || (raw < 0 && onLeft);
      x.value = allowed ? raw : raw * 0.18;
      const side = x.value > THRESHOLD ? 1 : x.value < -THRESHOLD ? -1 : 0;
      if (side !== armed.value) {
        armed.value = side;
        if (side !== 0) runOnJS(tapLight)();
      }
    })
    .onEnd(() => {
      if (x.value > THRESHOLD && onRight) {
        x.value = withSpring(0, { damping: 22, stiffness: 220 });
        runOnJS(fireRight)();
      } else if (x.value < -THRESHOLD && onLeft) {
        x.value = withTiming(-500, { duration: 220 }, (done) => {
          if (done) runOnJS(fireLeft)();
        });
      } else {
        x.value = withSpring(0, { damping: 24, stiffness: 260 });
      }
      armed.value = 0;
    });

  function fireRight() {
    tapMedium();
    onRight?.();
  }

  function fireLeft() {
    notifyWarn();
    onLeft?.();
  }

  const singleTap = Gesture.Tap()
    .enabled(!!onTap && !disabled)
    .maxDuration(260)
    .onBegin(() => {
      pressed.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.4 });
    })
    .onFinalize(() => {
      pressed.value = withTiming(0, { duration: 160 });
    })
    .onEnd((_e, success) => {
      if (success && onTap) runOnJS(onTap)();
    });

  const doubleTap = Gesture.Tap()
    .enabled(!!onDoubleTap && !disabled)
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((_e, success) => {
      if (success && onDoubleTap) {
        runOnJS(tapMedium)();
        runOnJS(onDoubleTap)();
      }
    });

  const gesture = Gesture.Race(pan, Gesture.Exclusive(doubleTap, singleTap));

  const card = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.97]) },
    ],
  }));

  const rightBg = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, THRESHOLD * 0.6], [0, 1], 'clamp'),
  }));
  const rightMark = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [0, THRESHOLD], [0.5, 1], 'clamp') }],
  }));
  const leftBg = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-THRESHOLD * 0.6, 0], [1, 0], 'clamp'),
  }));
  const leftMark = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [-THRESHOLD, 0], [1, 0.5], 'clamp') }],
  }));

  return (
    <View style={styles.wrap}>
      {!!onRight && (
        <Animated.View
          style={[styles.bg, { backgroundColor: rightColor, borderRadius: radius }, rightBg]}
        >
          <Animated.View style={[styles.mark, styles.markLeft, rightMark]}>
            <Ionicons name={rightIcon} size={20} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      )}
      {!!onLeft && (
        <Animated.View
          style={[styles.bg, { backgroundColor: leftColor, borderRadius: radius }, leftBg]}
        >
          <Animated.View style={[styles.mark, styles.markRight, leftMark]}>
            <Ionicons name={leftIcon} size={19} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      )}

      {/* touchAction="pan-y" (web) : laisse le défilement vertical natif de
          la liste passer à travers cette ligne, sinon impossible de
          scroller la liste en posant le doigt dessus. */}
      <GestureDetector gesture={gesture} touchAction="pan-y">
        <Animated.View style={card}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  mark: { position: 'absolute' },
  markLeft: { left: 20 },
  markRight: { right: 20 },
});
