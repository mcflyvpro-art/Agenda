import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tapLight } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import { Squish } from './Squish';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

/** Vignette de disposition : l'aperçu fait la démonstration, le texte confirme. */
export function OptionTile({ label, selected, onPress, children }: Props) {
  const { ui } = useSettings();
  return (
    <Squish
      scaleTo={0.95}
      dimTo={1}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={[styles.tile, selected && styles.tileOn, selected && { borderColor: ui.accent }]}
    >
      <View style={styles.preview}>{children}</View>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={[styles.label, selected && { color: ui.accent }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {selected && (
          <View
            style={[styles.check, { backgroundColor: ui.accent }]}
          >
            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 8,
  },
  tileOn: { backgroundColor: '#FFFFFF' },
  preview: { borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(32,32,43,0.03)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7, paddingHorizontal: 2 },
  texts: { flex: 1 },
  label: { fontSize: 13, fontWeight: '800', color: theme.ink, letterSpacing: -0.25 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
