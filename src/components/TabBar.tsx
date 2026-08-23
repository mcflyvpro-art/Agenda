import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import { Squish } from './Squish';

export type TabKey = 'home' | 'agenda' | 'todo';

export const TAB_BAR_HEIGHT = 58;

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

/** Trois portes, toujours à portée de pouce. */
export function TabBar({ tab, onChange, badge = 0, bottom }: Props) {
  const { ui } = useSettings();

  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
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
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0, { duration: 180 }),
  }));

  return (
    <Squish style={styles.item} scaleTo={0.92} dimTo={1} onPress={onPress}>
      <Animated.View style={[styles.pill, { backgroundColor: `${accent}1F` }, pill]} />
      <View>
        <Ionicons name={icon} size={22} color={active ? accent : 'rgba(32,32,43,0.28)'} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
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
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#7A5A6A',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48 },
  pill: { position: 'absolute', left: 14, right: 14, top: 2, bottom: 2, borderRadius: 22 },
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
