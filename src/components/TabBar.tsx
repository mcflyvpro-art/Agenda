import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import { Squish } from './Squish';

export type TabKey = 'home' | 'agenda' | 'todo';

export const TAB_BAR_HEIGHT = 62;

type Props = {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  badge?: number;
  bottom: number;
};

const ITEMS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'home', label: 'Accueil', icon: 'sunny-outline' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar-outline' },
  { key: 'todo', label: 'À faire', icon: 'sparkles-outline' },
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
            label={it.label}
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
  label,
  icon,
  accent,
  badge,
  onPress,
}: {
  active: boolean;
  label: string;
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
        <Ionicons name={icon} size={19} color={active ? accent : theme.inkFaint} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, active && { color: accent, fontWeight: '800' }]}>{label}</Text>
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
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 50 },
  pill: { position: 'absolute', left: 6, right: 6, top: 3, bottom: 3, borderRadius: 20 },
  label: { fontSize: 10.5, fontWeight: '700', color: theme.inkFaint, letterSpacing: -0.1 },
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
