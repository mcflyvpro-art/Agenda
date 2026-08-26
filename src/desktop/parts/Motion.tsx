import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Les quatre façons dont quelque chose peut arriver à l'écran. */
export type Enter = 'rise' | 'fade' | 'pop' | 'slide';

type Props = {
  children?: React.ReactNode;
  /** défaut : une montée de sept pixels en se révélant */
  enter?: Enter;
  /** retard, en millisecondes — c'est lui qui fait les entrées en cascade */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};

/**
 * Une surface qui arrive.
 *
 * L'animation n'est pas jouée par React : elle est déclarée une fois dans
 * la feuille de style du bureau et déclenchée ici par un simple attribut.
 * Le navigateur la compose alors sur son propre fil, ce qui la laisse
 * fluide même pendant qu'un mois entier se recalcule à côté — l'inverse
 * exact de ce qu'on obtiendrait en interpolant une opacité dans un état
 * React, où chaque image coûterait un rendu complet.
 *
 * Corollaire à connaître : l'animation se rejoue au montage, et
 * seulement au montage. Pour qu'une vue se réanime quand elle change de
 * nature — passer de la semaine au mois, par exemple — il faut lui
 * donner une `key` qui change avec elle ; sans quoi React réutilise le
 * nœud et rien ne bouge.
 */
export function Appear({ children, enter = 'rise', delay, style, pointerEvents }: Props) {
  return (
    <View
      pointerEvents={pointerEvents}
      dataSet={{ dkAnim: enter }}
      style={[style, delay ? ({ animationDelay: `${delay}ms` } as any) : null]}
    >
      {children}
    </View>
  );
}

/**
 * Le retard d'un élément dans une cascade.
 *
 * Deux garde-fous, l'un et l'autre appris à l'usage : un pas court (les
 * listes longues finiraient sinon par se remplir après que le regard est
 * déjà passé), et un plafond ferme, pour que le vingtième élément d'une
 * liste n'attende pas une seconde et demie avant d'exister.
 */
export function stagger(index: number, step = 26, max = 200): number {
  return Math.min(max, index * step);
}
