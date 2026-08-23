import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { tapMedium } from '../lib/haptics';
import { theme } from '../theme';
import { Squish } from './Squish';

export function AddButton({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(250).springify().damping(16)}
      style={[styles.wrap, { bottom }]}
    >
      <Squish
        scaleTo={0.9}
        dimTo={1}
        onPress={() => {
          tapMedium();
          onPress();
        }}
        style={styles.shadow}
      >
        <LinearGradient
          colors={['#B9A6F5', '#F5A8C6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </Squish>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, alignItems: 'center', pointerEvents: 'box-none' },
  shadow: {
    borderRadius: 30,
    shadowColor: '#8A6BC8',
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
