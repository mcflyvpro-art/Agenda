import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fromKey, hhmm, longDay } from '../../lib/date';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { alpha, dt } from '../theme';
import { Appear } from './Motion';
import { Kbd, Label, Press } from './Press';

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
 *
 * Ce qui suppose que la ligne choisie soit toujours visible : au-delà
 * d'une dizaine de résultats, la flèche du bas emmène le curseur sous le
 * bord de la liste, et on se retrouve à piloter à l'aveugle quelque chose
 * qu'on ne voit plus. D'où la mesure de chaque ligne et le recadrage
 * automatique — sans lui, la moitié des résultats serait hors d'usage au
 * clavier, c'est-à-dire hors d'usage.
 */
export function Palette({ visible, onClose, commands, events, onOpenEvent }: Props) {
  const { swatch, settings, ui } = useSettings();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  /** position et hauteur de chaque ligne dans le contenu défilant */
  const rowBox = useRef<Record<number, { y: number; h: number }>>({});
  const viewH = useRef(0);
  const scrollY = useRef(0);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setCursor(0);
      rowBox.current = {};
      scrollY.current = 0;
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

  const count = matchedCommands.length + matchedEvents.length;

  useEffect(() => setCursor(0), [q]);

  /* Ramener la ligne choisie dans le cadre, par le plus court chemin. */
  useEffect(() => {
    const box = rowBox.current[cursor];
    if (!box || !viewH.current) return;
    const top = scrollY.current;
    const bottom = top + viewH.current;
    if (box.y < top) scrollRef.current?.scrollTo({ y: Math.max(0, box.y - 8), animated: true });
    else if (box.y + box.h > bottom)
      scrollRef.current?.scrollTo({ y: box.y + box.h - viewH.current + 8, animated: true });
  }, [cursor]);

  const measure = useCallback(
    (i: number) => (e: any) => {
      const { y, height } = e.nativeEvent.layout;
      rowBox.current[i] = { y, h: height };
    },
    [],
  );

  const runAt = (i: number) => {
    if (i < 0) return;
    if (i < matchedCommands.length) {
      const cmd = matchedCommands[i];
      if (!cmd) return;
      onClose();
      cmd.run();
      return;
    }
    const found = matchedEvents[i - matchedCommands.length];
    if (!found) return;
    onClose();
    onOpenEvent(found);
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
      setCursor((c) => Math.min(count - 1, c + 1));
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
      <Appear enter="fade" style={StyleSheet.absoluteFill as any}>
        <Press onPress={onClose} style={StyleSheet.absoluteFill} hoverStyle={null} />
      </Appear>

      <Appear enter="pop" style={styles.panel}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={dt.inkFaint} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onKeyPress={onKeyPress}
            placeholder="Chercher un événement, une action…"
            placeholderTextColor={dt.inkFaint}
            dataSet={{ dk: 'bare' }}
            style={[styles.input, noOutline]}
          />
          <Kbd>Échap</Kbd>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e) => {
            viewH.current = e.nativeEvent.layout.height;
          }}
        >
          {count === 0 && (
            <View style={styles.noneRow}>
              <Ionicons name="search-outline" size={16} color={dt.inkFaint} />
              <Text style={styles.none}>Rien ne correspond.</Text>
            </View>
          )}

          {matchedCommands.length > 0 && <Label style={styles.group}>Actions</Label>}
          {matchedCommands.map((c, i) => (
            <Row
              key={c.id}
              index={i}
              active={cursor === i}
              accent={ui.accent}
              onPress={() => runAt(i)}
              onLayout={measure(i)}
            >
              <View
                style={[
                  styles.iconBox,
                  cursor === i && { backgroundColor: alpha(ui.accent, 0.16) },
                ]}
              >
                <Ionicons name={c.icon} size={14} color={cursor === i ? ui.accent : dt.inkSoft} />
              </View>
              <Text style={styles.rowLabel}>{c.label}</Text>
              {!!c.hint && <Kbd>{c.hint}</Kbd>}
            </Row>
          ))}

          {matchedEvents.length > 0 && <Label style={styles.group}>Événements</Label>}
          {matchedEvents.map((e, i) => {
            const idx = matchedCommands.length + i;
            const c = swatch(e.color);
            return (
              <Row
                key={e.id}
                index={idx}
                active={cursor === idx}
                accent={ui.accent}
                onPress={() => runAt(idx)}
                onLayout={measure(idx)}
              >
                <View style={[styles.iconBox, { backgroundColor: c.wash }]}>
                  <View style={[styles.dot, { backgroundColor: c.solid }]} />
                </View>
                <Text numberOfLines={1} style={styles.rowLabel}>
                  {settings.showEmoji ? `${e.emoji} ` : ''}
                  {e.title}
                </Text>
                <Text style={styles.rowHint}>
                  {longDay(fromKey(e.date))}
                  {e.allDay ? '' : ` · ${hhmm(e.start)}`}
                </Text>
              </Row>
            );
          })}
        </ScrollView>

        <View style={styles.foot}>
          <Hint keys="↑↓" text="parcourir" />
          <Hint keys="↵" text="ouvrir" />
          <Hint keys="Échap" text="fermer" />
        </View>
      </Appear>
    </View>
  );
}

function Row({
  children,
  active,
  accent,
  onPress,
  onLayout,
}: {
  children: React.ReactNode;
  index: number;
  active: boolean;
  accent: string;
  onPress: () => void;
  onLayout: (e: any) => void;
}) {
  return (
    <Press
      onPress={onPress}
      onLayout={onLayout}
      style={[styles.row, active && { backgroundColor: alpha(accent, 0.11) }]}
      hoverStyle={active ? null : { backgroundColor: dt.hover }}
    >
      {children}
    </Press>
  );
}

function Hint({ keys, text }: { keys: string; text: string }) {
  return (
    <View style={styles.hint}>
      <Kbd>{keys}</Kbd>
      <Text style={styles.hintText}>{text}</Text>
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
    backgroundColor: 'rgba(26,22,38,0.32)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    alignItems: 'center',
    paddingTop: '9%',
    zIndex: 100,
  } as any,
  panel: {
    width: 580,
    maxWidth: '92%',
    maxHeight: 460,
    backgroundColor: dt.panel,
    borderRadius: dt.radius.lg,
    overflow: 'hidden',
    ...dt.shadow.pop,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 54,
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: dt.ink },
  list: { flexShrink: 1, paddingVertical: 6 },
  group: { paddingHorizontal: dt.gap.md, paddingTop: 9, paddingBottom: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 36,
    marginHorizontal: 6,
    paddingHorizontal: 8,
    borderRadius: dt.radius.sm,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: dt.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: dt.ink },
  rowHint: { fontSize: 11, fontWeight: '600', color: dt.inkFaint },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: dt.gap.md,
  },
  none: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600' },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dt.gap.md,
    height: 34,
    paddingHorizontal: dt.gap.md,
    borderTopWidth: 1,
    borderTopColor: dt.line,
    backgroundColor: dt.sunken,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint },
});
