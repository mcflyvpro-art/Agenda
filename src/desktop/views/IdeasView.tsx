import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { durationLabel } from '../../lib/date';
import { useSettings } from '../../store/settings';
import { useTodos } from '../../store/todos';
import type { Todo } from '../../types';
import { dt } from '../theme';
import { Press } from '../parts/Press';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

type Props = {
  onSchedule: (t: Todo) => void;
};

/**
 * La boîte à idées, en deux colonnes.
 *
 * Sur téléphone les idées faites disparaissent en bas d'une liste qu'il
 * faut faire défiler. Ici les deux états tiennent côte à côte : ce qui
 * reste à faire à gauche, ce qui est réglé à droite, plus pâle. Voir la
 * colonne de droite grossir est la moitié de l'intérêt d'une liste de
 * tâches, et c'est précisément ce que la place manquait pour montrer.
 */
export function IdeasView({ onSchedule }: Props) {
  const { ui, swatch } = useSettings();
  const { pending, done, add, toggleDone, remove, clearDone } = useTodos();
  const [draft, setDraft] = useState('');

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    add(t);
    setDraft('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.composer}>
        <Ionicons name="add" size={17} color={dt.inkFaint} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Une idée…"
          placeholderTextColor={dt.inkFaint}
          style={[styles.composerInput, noOutline]}
          returnKeyType="done"
        />
        {draft.trim().length > 0 && (
          <Press onPress={submit} style={[styles.addBtn, { backgroundColor: ui.accent }]}>
            <Text style={styles.addText}>Ajouter</Text>
          </Press>
        )}
      </View>

      <View style={styles.cols}>
        <View style={styles.col}>
          <Text style={styles.colTitle}>{`À faire · ${pending.length}`}</Text>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {pending.length === 0 && <Text style={styles.empty}>Boîte vide.</Text>}
            {pending.map((t) => (
              <Row
                key={t.id}
                todo={t}
                onToggle={() => toggleDone(t.id)}
                onSchedule={() => onSchedule(t)}
                onRemove={() => remove(t.id)}
                accent={ui.accent}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.col}>
          <View style={styles.colHead}>
            <Text style={styles.colTitle}>{`Fait · ${done.length}`}</Text>
            {done.length > 0 && (
              <Press onPress={clearDone} style={styles.clear}>
                <Text style={[styles.clearText, { color: swatch('blush').deep }]}>Tout effacer</Text>
              </Press>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {done.length === 0 && <Text style={styles.empty}>Rien encore.</Text>}
            {done.map((t) => (
              <Row
                key={t.id}
                todo={t}
                muted
                onToggle={() => toggleDone(t.id)}
                onSchedule={() => onSchedule(t)}
                onRemove={() => remove(t.id)}
                accent={ui.accent}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function Row({
  todo,
  muted,
  onToggle,
  onSchedule,
  onRemove,
  accent,
}: {
  todo: Todo;
  muted?: boolean;
  onToggle: () => void;
  onSchedule: () => void;
  onRemove: () => void;
  accent: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <View
      // @ts-expect-error — react-native-web transmet ces gestionnaires au DOM
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <View style={[styles.row, muted && styles.rowMuted]}>
        <Press onPress={onToggle} style={styles.check} title="Fait / à faire">
          <Ionicons
            name={todo.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={17}
            color={todo.done ? accent : dt.inkFaint}
          />
        </Press>
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={[styles.rowTitle, muted && styles.strike]}>
            {todo.title}
          </Text>
          <Text style={styles.rowMeta}>{durationLabel(0, todo.estimate)}</Text>
        </View>
        {/* les actions n'apparaissent qu'au survol : la liste reste calme */}
        {hover && (
          <View style={styles.rowActions}>
            <Press onPress={onSchedule} style={styles.act} title="Placer dans l'agenda">
              <Ionicons name="calendar-outline" size={14} color={accent} />
            </Press>
            <Press onPress={onRemove} style={styles.act} title="Supprimer">
              <Ionicons name="trash-outline" size={14} color={dt.inkFaint} />
            </Press>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: dt.gap.lg, gap: dt.gap.md },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: dt.gap.md,
    borderRadius: dt.radius.md,
    backgroundColor: dt.panel,
    borderWidth: 1,
    borderColor: dt.line,
  },
  composerInput: { flex: 1, fontSize: 13.5, fontWeight: '600', color: dt.ink },
  addBtn: { height: 27, paddingHorizontal: 12, borderRadius: dt.radius.sm, justifyContent: 'center' },
  addText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  cols: { flex: 1, flexDirection: 'row', gap: dt.gap.md },
  col: { flex: 1, gap: 6 },
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  clear: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: dt.radius.xs },
  clearText: { fontSize: 11, fontWeight: '700' },
  list: { gap: 4, paddingBottom: 40 },
  empty: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600', paddingVertical: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    borderRadius: dt.radius.sm,
    paddingLeft: 8,
    paddingRight: 6,
    backgroundColor: dt.panel,
    borderWidth: 1.5,
    borderColor: dt.line,
  },
  rowMuted: { opacity: 0.6 },
  check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: dt.ink },
  strike: { textDecorationLine: 'line-through' },
  rowMeta: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: 1 },
  rowActions: { flexDirection: 'row', gap: 2 },
  act: { width: 26, height: 26, borderRadius: dt.radius.xs, alignItems: 'center', justifyContent: 'center' },
});
