import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE_OUT } from '../lib/motion';

type Props = {
  children: React.ReactNode;
  /** retard, en millisecondes — c'est lui qui fait les entrées en cascade */
  delay?: number;
  /** distance parcourue en arrivant ; négative pour venir du bas */
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Une carte qui arrive.
 *
 * Elle monte de quelques points en se révélant. Le déplacement est petit —
 * dix points, jamais plus — parce que le rôle de ce mouvement n'est pas
 * d'être vu mais de donner au regard un sens de lecture : de haut en bas,
 * dans l'ordre où les choses comptent.
 *
 * Deux précautions, et elles ont la même cause : une liste qu'on fait
 * défiler ne doit jamais bouger sous le doigt. D'abord l'animation ne
 * touche qu'à l'opacité et à `translateY`, deux propriétés que le
 * compositeur traite seul, sans jamais recalculer la position de quoi que
 * ce soit — la hauteur de la carte est la même à la première image qu'à
 * la dernière. Ensuite elle ne se joue qu'au montage : un réordonnancement
 * de la liste, une case cochée, un rendu de plus ne la relancent pas, là
 * où les animations de disposition automatiques rejoueraient et feraient
 * sauter la page sous les doigts.
 */
export function Appear({ children, delay = 0, offset = 10, style }: Props) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: DUR.smooth, easing: EASE_OUT }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * offset }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/**
 * Le retard d'un élément dans une cascade.
 *
 * Deux garde-fous appris à l'usage : un pas court, sans quoi la liste finit
 * de se remplir après que le regard est déjà passé, et un plafond ferme,
 * pour que la douzième carte n'attende pas une seconde avant d'exister.
 */
export function stagger(index: number, step = 34, max = 240): number {
  return Math.min(max, index * step);
}
