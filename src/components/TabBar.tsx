import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { alpha } from '../lib/color';
import { DUR, SPRING } from '../lib/motion';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import { Squish } from './Squish';

export type TabKey = 'home' | 'agenda' | 'todo';

export const TAB_BAR_HEIGHT = 58;
/** hauteur du dégradé qui dissout le contenu avant la barre */
const SCRIM = 64;

type Props = {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  badge?: number;
  bottom: number;
};

const ITEMS: { key: TabKey; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'home', icon: 'sunny' },
  { key: 'agenda', icon: 'calendar' },
  { key: 'todo', icon: 'sparkles' },
];

/**
 * Trois portes, toujours à portée de pouce.
 *
 * Deux choses la font tenir au-dessus du contenu sans le couper. Un
 * dégradé, d'abord, qui dissout la page dans le fond juste avant la barre :
 * sans lui une carte se trouve tranchée net au bord de la barre, ce qui la
 * fait lire comme la fin de la liste alors qu'elle continue. Du verre,
 * ensuite, plutôt qu'un blanc plein : ce qui passe dessous reste deviné,
 * et le regard sait qu'il y a encore quelque chose là-dessous.
 */
export function TabBar({ tab, onChange, badge = 0, bottom }: Props) {
  const { ui } = useSettings();
  const [barWidth, setBarWidth] = useState(0);
  const index = ITEMS.findIndex((it) => it.key === tab);
  const slot = barWidth > 0 ? (barWidth - 12) / ITEMS.length : 0;

  /* La pastille est plus étroite que la case : posée bord à bord elle
     ferait un bandeau, et on ne verrait plus qu'elle se déplace. */
  const pill = useAnimatedStyle(() => ({
    width: Math.max(0, slot - 18),
    opacity: withTiming(slot > 0 ? 1 : 0, { duration: DUR.instant }),
    transform: [{ translateX: withSpring(index * slot + 9, SPRING.settle) }],
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(ui.gradient[2], 0), ui.gradient[2]]}
        locations={[0, 0.7]}
        style={[styles.scrim, { height: SCRIM + bottom }]}
      />

      <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.glass} pointerEvents="none" />

        {/* la pastille glisse d'une porte à l'autre au lieu de s'allumer sur place */}
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: alpha(ui.accent, 0.14) }, pill]}
        />

        {ITEMS.map((it) => (
          <Item
            key={it.key}
            active={tab === it.key}
            icon={it.icon}
            accent={ui.accent}
            badge={it.key === 'todo' ? badge : 0}
            onPress={() => {
              if (tab === it.key) return;
              tapSoft();
              onChange(it.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Item({
  active,
  icon,
  accent,
  badge,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  badge: number;
  onPress: () => void;
}) {
  /* L'icône active enfle d'un cheveu : le repère de couleur seul se perd
     quand le pouce couvre la moitié de la barre. */
  const lift = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(active ? 1.08 : 1, SPRING.press) }],
  }));

  return (
    <Squish style={styles.item} scaleTo={0.9} dimTo={1} onPress={onPress}>
      <Animated.View style={lift}>
        <Ionicons name={icon} size={22} color={active ? accent : 'rgba(32,32,43,0.3)'} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </Animated.View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: 26,
    paddingHorizontal: 6,
    alignItems: 'center',
    overflow: 'hidden',
    ...theme.shadow.lift,
  },
  /* le verre : un voile blanc par-dessus le flou, sinon le fond le traverse */
  glass: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48 },
  pill: { position: 'absolute', left: 6, top: 5, bottom: 5, borderRadius: 22 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -9,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' },
});
