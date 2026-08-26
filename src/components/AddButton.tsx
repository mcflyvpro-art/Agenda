import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tapMedium } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { glow } from '../theme';
import { Squish } from './Squish';

type Props = { onPress: () => void; onLongPress?: () => void; bottom: number };

/**
 * L'action principale, posée en bas à droite.
 *
 * Son ombre est teintée de sa propre couleur, pas grise : un disque violet
 * dont l'ombre est grise a l'air collé sur l'écran, le même dont l'ombre
 * est violette a l'air d'éclairer ce qu'il y a dessous. C'est la seule
 * chose de l'interface qui se comporte comme une source de lumière, et
 * c'est justement ce qui la fait repérer sans avoir à la chercher.
 */
export function AddButton({ onPress, onLongPress, bottom }: Props) {
  const { ui } = useSettings();
  return (
    <View style={[styles.wrap, { bottom }]}>
      <Squish
        scaleTo={0.92}
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
        style={[styles.shadow, glow(ui.accent, 1.15)]}
      >
        <LinearGradient
          colors={[ui.accent, ui.today]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {/* le reflet du haut : ce qui empêche le disque de paraître plat */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, alignItems: 'center', pointerEvents: 'box-none' },
  shadow: { borderRadius: 30 },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
