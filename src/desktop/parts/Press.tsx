import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { dt } from '../theme';

type Props = {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** teinte du survol ; par défaut un voile d'encre discret */
  hoverStyle?: StyleProp<ViewStyle>;
  active?: boolean;
  activeStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  title?: string;
};

/**
 * La zone cliquable du bureau.
 *
 * Sur mobile un appui s'annonce en se comprimant, parce qu'un doigt cache
 * ce qu'il touche. Au curseur, l'information utile arrive bien avant le
 * clic : c'est le survol qui dit « ceci répond ». D'où une brique qui
 * traite le survol en premier et l'enfoncement en second, l'inverse de son
 * équivalent tactile.
 */
export function Press({
  children,
  onPress,
  style,
  hoverStyle,
  active,
  activeStyle,
  disabled,
  title,
}: Props) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => {
        setHover(false);
        setDown(false);
      }}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      // @ts-expect-error — react-native-web transmet ces attributs au DOM
      title={title}
      style={[
        style,
        hover && !disabled && (hoverStyle ?? styles.hover),
        active && (activeStyle ?? styles.active),
        down && !disabled && styles.down,
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Un bouton d'icône carré, la brique la plus fréquente des barres. */
export function IconButton({
  children,
  onPress,
  active,
  title,
  size = 30,
  tone,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  title?: string;
  size?: number;
  tone?: string;
}) {
  return (
    <Press
      onPress={onPress}
      active={active}
      title={title}
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: dt.radius.sm },
        tone ? { backgroundColor: tone } : null,
      ]}
    >
      {children}
    </Press>
  );
}

/** Le rappel du raccourci clavier, à droite d'une action. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.kbd}>
      <Text style={styles.kbdText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hover: { backgroundColor: dt.hover },
  active: { backgroundColor: dt.hoverStrong },
  down: { opacity: 0.72 },
  disabled: { opacity: 0.38 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  kbd: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: dt.radius.xs,
    backgroundColor: dt.sunken,
    alignItems: 'center',
  },
  kbdText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: dt.inkFaint,
    letterSpacing: 0.3,
  },
});
