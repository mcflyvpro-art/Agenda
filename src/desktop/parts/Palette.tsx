import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fromKey, hhmm, longDay } from '../../lib/date';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { dt } from '../theme';
import { Press } from './Press';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  run: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  commands: Command[];
  events: AgendaEvent[];
  onOpenEvent: (e: AgendaEvent) => void;
};

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * La palette de commandes, sur ⌘K.
 *
 * Elle remplace à elle seule ce qui, sur téléphone, demanderait de
 * traverser plusieurs écrans : chercher un événement, changer d'échelle,
 * sauter à une date. Tout se fait au clavier, sans jamais lâcher la
 * frappe — c'est le geste le plus rentable d'une interface bureau, et
 * celui qui n'a aucun équivalent tactile.
 */
export function Palette({ visible, onClose, commands, events, onOpenEvent }: Props) {
  const { swatch, settings } = useSettings();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setCursor(0);
      // le focus doit attendre que la couche soit posée
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const q = normalize(query.trim());

  const matchedCommands = useMemo(
    () => (q ? commands.filter((c) => normalize(c.label).includes(q)) : commands),
    [commands, q],
  );

  const matchedEvents = useMemo(() => {
    if (q.length < 2) return [];
    return events
      .filter((e) => normalize(e.title).includes(q) || normalize(e.location).includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [events, q]);

  const rows = useMemo(
    () => [
      ...matchedCommands.map((c) => ({ kind: 'cmd' as const, cmd: c })),
      ...matchedEvents.map((e) => ({ kind: 'event' as const, event: e })),
    ],
    [matchedCommands, matchedEvents],
  );

  useEffect(() => setCursor(0), [q]);

  const runAt = (i: number) => {
    const row = rows[i];
    if (!row) return;
    onClose();
    if (row.kind === 'cmd') row.cmd.run();
    else onOpenEvent(row.event);
  };

  /*
    Les flèches et Entrée sont captées ici plutôt que par la table globale
    des raccourcis : tant que la palette est ouverte, elles lui
    appartiennent, et elle a le focus.
  */
  const onKeyPress = (e: any) => {
    const key = e.nativeEvent?.key;
    if (key === 'ArrowDown') {
      e.preventDefault?.();
      setCursor((c) => Math.min(rows.length - 1, c + 1));
    } else if (key === 'ArrowUp') {
      e.preventDefault?.();
      setCursor((c) => Math.max(0, c - 1));
    } else if (key === 'Enter') {
      e.preventDefault?.();
      runAt(cursor);
    } else if (key === 'Escape') {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Press onPress={onClose} style={StyleSheet.absoluteFill} hoverStyle={null} />
      <View style={styles.panel}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={dt.inkFaint} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onKeyPress={onKeyPress}
            placeholder="Chercher un événement, une action…"
            placeholderTextColor={dt.inkFaint}
            style={[styles.input, noOutline]}
          />
          <Text style={styles.esc}>Échap</Text>
        </View>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {rows.length === 0 && <Text style={styles.none}>Rien ne correspond.</Text>}

          {matchedCommands.length > 0 && <Text style={styles.group}>Actions</Text>}
          {matchedCommands.map((c, i) => (
            <Press
              key={c.id}
              onPress={() => runAt(i)}
              active={cursor === i}
              style={styles.row}
            >
              <Ionicons name={c.icon} size={15} color={dt.inkSoft} />
              <Text style={styles.rowLabel}>{c.label}</Text>
              {!!c.hint && <Text style={styles.rowHint}>{c.hint}</Text>}
            </Press>
          ))}

          {matchedEvents.length > 0 && <Text style={styles.group}>Événements</Text>}
          {matchedEvents.map((e, i) => {
            const idx = matchedCommands.length + i;
            const c = swatch(e.color);
            return (
              <Press key={e.id} onPress={() => runAt(idx)} active={cursor === idx} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: c.solid }]} />
                <Text style={styles.rowLabel}>
                  {settings.showEmoji ? `${e.emoji} ` : ''}
                  {e.title}
                </Text>
                <Text style={styles.rowHint}>
                  {longDay(fromKey(e.date))}
                  {e.allDay ? '' : ` · ${hhmm(e.start)}`}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,24,40,0.34)',
    alignItems: 'center',
    paddingTop: '10%',
    zIndex: 100,
  },
  panel: {
    width: 560,
    maxWidth: '92%',
    maxHeight: 420,
    backgroundColor: dt.panel,
    borderRadius: dt.radius.lg,
    overflow: 'hidden',
    ...dt.shadow.pop,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  input: { flex: 1, fontSize: 14.5, fontWeight: '600', color: dt.ink },
  esc: { fontSize: 10.5, fontWeight: '700', color: dt.inkFaint },
  list: { paddingVertical: 6 },
  group: {
    fontSize: 9.5,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: dt.gap.md,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 34,
    marginHorizontal: 6,
    paddingHorizontal: 10,
    borderRadius: dt.radius.sm,
  },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: dt.ink },
  rowHint: { fontSize: 11, fontWeight: '600', color: dt.inkFaint },
  dot: { width: 8, height: 8, borderRadius: 4 },
  none: { padding: dt.gap.md, fontSize: 12.5, color: dt.inkFaint, fontWeight: '600' },
});
