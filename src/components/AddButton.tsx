import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tapMedium } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { Squish } from './Squish';

type Props = { onPress: () => void; onLongPress?: () => void; bottom: number };

export function AddButton({ onPress, onLongPress, bottom }: Props) {
  const { ui } = useSettings();
  return (
    <View style={[styles.wrap, { bottom }]}>
      <Squish
        scaleTo={0.94}
        dimTo={1}
        onPress={() => {
          tapMedium();
          onPress();
        }}
        onLongPress={
          onLongPress
            ? () => {
                tapMedium();
                onLongPress();
              }
            : undefined
        }
        delayLongPress={320}
        style={[styles.shadow, { shadowColor: ui.accent }]}
      >
        <LinearGradient
          colors={[ui.accent, ui.today]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, alignItems: 'center', pointerEvents: 'box-none' },
  shadow: {
    borderRadius: 30,
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
