import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SPRING } from '../lib/motion';
import { tapLight, tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { EventCard } from './EventCard';
import { Squish } from './Squish';

type Props = {
  /** libellé du jour choisi (« Aujourd'hui », « Jeudi 27 août »…) */
  label: string;
  events: AgendaEvent[];
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onCreate: () => void;
  /** position haute : la feuille recouvre une partie de la grille */
  topExpanded: number;
  /** position basse : la feuille commence sous la grille */
  topCollapsed: number;
  /** hauteur disponible sous l'en-tête de l'écran */
  bodyHeight: number;
  /** place occupée par la barre d'onglets flottante */
  bottomInset: number;
};

/**
 * Les événements du jour choisi, en vue Mois.
 *
 * La feuille a deux positions : posée sous la grille, ou tirée vers le
 * haut pour recouvrir une partie du calendrier quand la journée est
 * chargée. On la déplace par la poignée, le contenu défile de son côté —
 * deux gestes séparés, donc jamais en concurrence.
 *
 * Sa hauteur ne change jamais : seul un `translateY` la déplace. C'est ce
 * qui garde le mouvement fluide, sans recalcul de mise en page à chaque
 * image.
 */
export function DaySheet({
  label,
  events,
  onOpen,
  onToggle,
  onRemove,
  onCreate,
  topExpanded,
  topCollapsed,
  bodyHeight,
  bottomInset,
}: Props) {
  const { ui } = useSettings();
  const travel = Math.max(0, topCollapsed - topExpanded);
  const height = Math.max(0, bodyHeight - topExpanded);
  const movable = travel > 0;

  // position courante : 0 = tirée en haut, `travel` = posée sous la grille
  const ty = useSharedValue(travel);
  const startY = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);

  // la géométrie a changé (densité, réglages, rotation…) : on se recale net
  // sur la position de l'état courant — c'est une mise en page, pas un geste
  useEffect(() => {
    ty.value = expanded ? 0 : travel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travel]);

  /**
   * Suite d'une bascule : l'état React et le retour haptique.
   * On ne réveille React que si la position change vraiment — un simple
   * repli sur place ne doit pas provoquer de rendu au milieu du ressort.
   */
  const settle = (toExpanded: boolean) => {
    setExpanded((cur) => {
      if (cur !== toExpanded) tapSoft();
      return toExpanded;
    });
  };

  /** bascule déclenchée par un tap sur la poignée */
  const toggle = () => {
    if (!movable) return;
    const next = !expanded;
    ty.value = withSpring(next ? 0 : travel, SPRING.panel);
    settle(next);
  };

  const pan = Gesture.Pan()
    .enabled(movable)
    .onStart(() => {
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      /* Bornage strict entre les deux positions. Une résistance élastique
         laissait la feuille dépasser ses limites : tirée vers le bas elle
         emmenait sa liste hors de l'écran, d'où des cartes qui semblaient
         disparaître. Ici elle ne peut littéralement pas en sortir. */
      const raw = startY.value + e.translationY;
      ty.value = Math.max(0, Math.min(travel, raw));
    })
    .onEnd((e) => {
      // la vitesse décide d'abord, la position ensuite
      const toExpanded =
        e.velocityY < -350 ? true : e.velocityY > 350 ? false : ty.value < travel / 2;
      ty.value = withSpring(toExpanded ? 0 : travel, SPRING.panel);
      runOnJS(settle)(toExpanded);
    });

  // `travel` peut valoir 0 (grille qui occupe tout) : on garde une plage
  // d'interpolation non dégénérée, la feuille reste alors simplement en haut
  const span = Math.max(1, travel);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  // l'ombre se creuse à mesure que la feuille se détache de la grille
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(ty.value, [span, 0], [0.06, 0.15], 'clamp'),
  }));

  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(ty.value, [span, 0], [0, 180], 'clamp')}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.sheet,
        { top: topExpanded, height, shadowColor: ui.accent },
        shadowStyle,
        sheetStyle,
      ]}
    >
      <GestureDetector gesture={pan} touchAction="none">
        <View>
          <Squish style={styles.head} scaleTo={1} dimTo={1} onPress={toggle}>
            <View style={styles.grab} />
            <View style={styles.headRow}>
              <Text numberOfLines={1} style={styles.title}>
                {label}
              </Text>
              <Text style={styles.count}>{events.length}</Text>
              {movable && (
                <Animated.View style={chevron}>
                  <Ionicons name="chevron-up" size={15} color={theme.inkFaint} />
                </Animated.View>
              )}
            </View>
          </Squish>
        </View>
      </GestureDetector>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          /* Marge du bas constante, calculée pour la position basse — la
             plus défavorable, puisque le bas de la feuille passe alors sous
             la barre d'onglets. La faire dépendre de l'état rejouait une
             mise en page en plein ressort, et la liste sautait sous le
             doigt. Une valeur fixe : plus rien ne bouge en basculant. */
          { paddingBottom: bottomInset + 20 + travel },
        ]}
      >
        {events.length === 0 ? (
          <Squish
            style={styles.empty}
            onPress={() => {
              tapLight();
              onCreate();
            }}
          >
            <View style={[styles.emptyPlus, { backgroundColor: `${ui.accent}14` }]}>
              <Ionicons name="add" size={22} color={ui.accent} />
            </View>
          </Squish>
        ) : (
          events.map((e, i) => (
            <EventCard
              key={e.id}
              event={e}
              index={i}
              onPress={onOpen}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.9)',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  head: { paddingTop: 8, paddingBottom: 10, paddingHorizontal: 20 },
  grab: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(32,32,43,0.14)',
    marginBottom: 10,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: theme.ink, letterSpacing: -0.4 },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  list: { paddingHorizontal: 18, paddingTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 26 },
  emptyPlus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
