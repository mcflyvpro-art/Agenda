import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { durationLabel, hhmm } from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  events: AgendaEvent[] | null;
  onClose: () => void;
  onOpen: (e: AgendaEvent) => void;
};

/**
 * Ce qui se chevauche, déplié.
 *
 * Dans la grille, trois rendez-vous à la même heure ne tiennent pas côte à
 * côte sans devenir illisibles. La timeline les replie donc derrière une
 * seule carte, et c'est ici qu'on les retrouve : en pleine largeur, dans
 * l'ordre, chacun ouvrable.
 */
export function OverlapSheet({ events, onClose, onOpen }: Props) {
  const { settings, swatch } = useSettings();
  const visible = !!events && events.length > 0;
  const list = events ?? [];

  const span = list.length
    ? `${hhmm(Math.min(...list.map((e) => e.start)))} – ${hhmm(Math.max(...list.map((e) => e.end)))}`
    : '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>

        <View style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{list.length} en même temps</Text>
              <Text style={styles.span}>{span}</Text>
            </View>
            <Squish style={styles.close} scaleTo={0.9} onPress={onClose}>
              <Ionicons name="close" size={18} color={theme.inkSoft} />
            </Squish>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {list.map((e, i) => {
              const c = swatch(e.color);
              return (
                <View key={e.id}>
                  <Squish
                    style={[styles.row, { backgroundColor: c.wash }]}
                    onPress={() => {
                      tapSoft();
                      onClose();
                      onOpen(e);
                    }}
                  >
                    <View style={[styles.bar, { backgroundColor: c.solid }]} />
                    {settings.showEmoji && <Text style={styles.emoji}>{e.emoji}</Text>}
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.rowTitle,
                          { color: c.deep },
                          e.done && { textDecorationLine: 'line-through', opacity: 0.6 },
                        ]}
                      >
                        {e.title}
                      </Text>
                      <Text style={[styles.rowTime, { color: c.deep }]}>
                        {hhmm(e.start)} – {hhmm(e.end)} · {durationLabel(e.start, e.end)}
                      </Text>
                    </View>
                  </Squish>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  backdrop: { backgroundColor: 'rgba(24,20,32,0.34)' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.xl,
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 16,
    maxHeight: '72%',
    ...theme.shadow.lift,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, paddingBottom: 14 },
  title: { fontSize: 19, fontWeight: '800', color: theme.ink, letterSpacing: -0.5 },
  span: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  scroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  emoji: { fontSize: 19 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.3 },
  rowTime: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.85,
    fontVariant: ['tabular-nums'],
  },
});
