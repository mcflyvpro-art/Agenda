import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '../theme';

export function EmptyDay({ label = 'Rien de prévu' }: { label?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={styles.emoji}>🌤️</Text>
      </View>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.sub}>Une journée toute douce. Touche + pour ajouter.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 30 },
  bubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...theme.shadow.soft,
  },
  emoji: { fontSize: 30 },
  title: { fontSize: 16.5, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  sub: {
    fontSize: 13.5,
    fontWeight: '500',
    color: theme.inkFaint,
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
