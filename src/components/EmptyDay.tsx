import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Appear } from './Appear';

/** Un vide qui se voit, sans avoir à s'expliquer. */
export function EmptyDay() {
  return (
    <Appear delay={60} style={styles.wrap}>
      <View style={styles.bubble}>
        <Ionicons name="ellipse-outline" size={22} color={theme.inkFaint} />
      </View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 34 },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
    ...theme.shadow.soft,
  },
});
