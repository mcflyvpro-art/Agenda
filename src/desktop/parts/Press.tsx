import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { dt } from '../theme';

/**
 * Ce que la surface est, du point de vue du mouvement.
 *
 * Le nom part dans un attribut `data-dk`, où la feuille de style du
 * bureau lui accroche la bonne transition. Une case de calendrier ne doit
 * pas réagir à la même vitesse qu'une carte qui se soulève, et ce qui
 * suit le curseur au pixel près ne doit pas être amorti du tout.
 */
export type PressKind = 'press' | 'card' | 'event' | 'live';

type Props = {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Teinte du survol. Par défaut, un voile d'encre discret ; `null` pour
   * une surface qui ne doit pas répondre au curseur — un voile de fond,
   * par exemple, cliquable mais qui n'est pas un bouton.
   */
  hoverStyle?: StyleProp<ViewStyle> | null;
  active?: boolean;
  activeStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  title?: string;
  kind?: PressKind;
  /** l'enfoncement s'écrase légèrement au lieu de pâlir */
  sink?: boolean;
  /** remonté au parent, pour les rangées qui révèlent leurs actions au survol */
  onHoverChange?: (hover: boolean) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/**
 * La zone cliquable du bureau.
 *
 * Sur mobile un appui s'annonce en se comprimant, parce qu'un doigt cache
 * ce qu'il touche. Au curseur, l'information utile arrive bien avant le
 * clic : c'est le survol qui dit « ceci répond ». D'où une brique qui
 * traite le survol en premier et l'enfoncement en second, l'inverse de son
 * équivalent tactile.
 *
 * Le passage d'un état à l'autre n'est jamais interpolé ici. React ne
 * décide que de l'état d'arrivée — fond, ombre, position — et la feuille
 * de style du bureau se charge du trajet, sur le fil du compositeur.
 * C'est ce qui permet de survoler une grille de trente-cinq cases sans
 * qu'aucune image ne soit sautée.
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
  kind = 'press',
  sink,
  onHoverChange,
  onLayout,
}: Props) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const node = useRef<any>(null);

  /*
    L'infobulle du système, posée à la main sur le nœud.

    React Native Web ne laisse passer vers le DOM qu'une liste fermée
    d'attributs, et `title` n'en fait pas partie : écrit dans les
    propriétés, il est retiré en silence, et aucune des infobulles de
    l'interface n'atteignait le navigateur. Or c'est par elles que
    s'apprennent les raccourcis — « Précédent (←) », « Rechercher (⌘K) » —
    et sans elles une barre d'icônes ne dit plus ce qu'elle fait. On
    l'écrit donc directement sur l'élément, une fois qu'il existe.
  */
  useEffect(() => {
    const el: HTMLElement | null = node.current;
    if (!el || typeof el.setAttribute !== 'function') return;
    if (title) el.setAttribute('title', title);
    else el.removeAttribute('title');
  }, [title]);

  const enter = useCallback(() => {
    setHover(true);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const leave = useCallback(() => {
    setHover(false);
    setDown(false);
    onHoverChange?.(false);
  }, [onHoverChange]);

  return (
    <Pressable
      ref={node}
      onPress={disabled ? undefined : onPress}
      onHoverIn={enter}
      onHoverOut={leave}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onLayout={onLayout}
      dataSet={{ dk: kind }}
      style={[
        style,
        hover && !disabled && (hoverStyle === undefined ? styles.hover : hoverStyle),
        active && (activeStyle ?? styles.active),
        down && !disabled && (sink ? styles.sink : styles.down),
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
      sink
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

/**
 * Le rappel du raccourci clavier, à droite d'une action.
 *
 * Dessiné comme une touche vue de dessus : un liseré plus sombre en bas
 * suffit à faire lire l'épaisseur, là où une ombre portée alourdirait un
 * élément qui doit rester au second plan.
 */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.kbd}>
      <Text style={styles.kbdText}>{children}</Text>
    </View>
  );
}

/** Un intitulé de section : petites capitales, très en retrait. */
export function Label({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  hover: { backgroundColor: dt.hover },
  active: { backgroundColor: dt.hoverStrong },
  down: { opacity: 0.7 },
  sink: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.38 },
  icon: { alignItems: 'center', justifyContent: 'center' },

  kbd: {
    minWidth: 19,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: dt.radius.xs,
    backgroundColor: dt.sunken,
    borderWidth: 1,
    borderColor: dt.line,
    borderBottomColor: dt.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbdText: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    letterSpacing: 0.2,
    lineHeight: 12,
  },

  label: {
    fontSize: 9.5,
    fontWeight: '800',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
