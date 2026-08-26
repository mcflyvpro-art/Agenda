import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { durationLabel } from '../../lib/date';
import { useSettings } from '../../store/settings';
import { useTodos } from '../../store/todos';
import type { Todo } from '../../types';
import { alpha, dt } from '../theme';
import { Appear, stagger } from '../parts/Motion';
import { Label, Press } from '../parts/Press';

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
  const ready = draft.trim().length > 0;

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    add(t);
    setDraft('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.composer}>
        <View style={[styles.composerIcon, { backgroundColor: alpha(ui.accent, 0.12) }]}>
          <Ionicons name="add" size={16} color={ui.accent} />
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Une idée…"
          placeholderTextColor={dt.inkFaint}
          style={[styles.composerInput, noOutline]}
          returnKeyType="done"
        />
        {ready && (
          <Press
            onPress={submit}
            style={
              [
                styles.addBtn,
                {
                  backgroundColor: ui.accent,
                  boxShadow: `0 4px 12px -4px ${alpha(ui.accent, 0.65)}`,
                },
              ] as any
            }
            hoverStyle={{ transform: [{ translateY: -1 }] }}
          >
            <Text style={styles.addText}>Ajouter</Text>
            <Text style={styles.addHint}>↵</Text>
          </Press>
        )}
      </View>

      <View style={styles.cols}>
        <View style={styles.col}>
          <View style={styles.colHead}>
            <Label>À faire</Label>
            <Count value={pending.length} tone={ui.accent} />
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {pending.length === 0 && (
              <Empty icon="sparkles-outline" text="Boîte vide. Rien n’attend." />
            )}
            {pending.map((t, i) => (
              <Appear key={t.id} delay={stagger(i, 20, 160)}>
                <Row
                  todo={t}
                  onToggle={() => toggleDone(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onRemove={() => remove(t.id)}
                  accent={ui.accent}
                />
              </Appear>
            ))}
          </ScrollView>
        </View>

        <View style={styles.col}>
          <View style={styles.colHead}>
            <Label>Fait</Label>
            <Count value={done.length} tone={dt.inkFaint} />
            <View style={styles.flex} />
            {done.length > 0 && (
              <Press
                onPress={clearDone}
                style={styles.clear}
                hoverStyle={{ backgroundColor: alpha(swatch('blush').solid, 0.14) }}
              >
                <Text style={[styles.clearText, { color: swatch('blush').deep }]}>
                  Tout effacer
                </Text>
              </Press>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {done.length === 0 && <Empty icon="checkmark-done-outline" text="Rien encore." />}
            {done.map((t, i) => (
              <Appear key={t.id} delay={stagger(i, 20, 160)}>
                <Row
                  todo={t}
                  muted
                  onToggle={() => toggleDone(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onRemove={() => remove(t.id)}
                  accent={ui.accent}
                />
              </Appear>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function Count({ value, tone }: { value: number; tone: string }) {
  return (
    <View style={[styles.count, { backgroundColor: alpha(tone, 0.13) }]}>
      <Text style={[styles.countText, { color: tone }]}>{value}</Text>
    </View>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={20} color={dt.inkFaint} />
      <Text style={styles.emptyText}>{text}</Text>
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
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      dataSet={{ dk: 'card' }}
      style={
        [
          styles.row,
          muted && styles.rowMuted,
          hover && {
            borderColor: dt.lineStrong,
            boxShadow: '0 2px 4px rgba(40,34,62,0.06), 0 10px 20px -12px rgba(40,34,62,0.24)',
            transform: [{ translateY: -1 }],
          },
        ] as any
      }
    >
      <Press onPress={onToggle} style={styles.check} title="Fait / à faire" sink>
        <Ionicons
          name={todo.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
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
          <Press
            onPress={onSchedule}
            style={styles.act}
            title="Placer dans l'agenda"
            hoverStyle={{ backgroundColor: alpha(accent, 0.14) }}
            sink
          >
            <Ionicons name="calendar-outline" size={14} color={accent} />
          </Press>
          <Press onPress={onRemove} style={styles.act} title="Supprimer" sink>
            <Ionicons name="trash-outline" size={14} color={dt.inkFaint} />
          </Press>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: dt.gap.lg, gap: dt.gap.md },
  flex: { flex: 1 },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 9,
    paddingRight: 9,
    borderRadius: dt.radius.md,
    backgroundColor: dt.panel,
    borderWidth: 1,
    borderColor: dt.line,
    ...dt.shadow.panel,
  },
  composerIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: { flex: 1, fontSize: 14, fontWeight: '600', color: dt.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 30,
    paddingHorizontal: 13,
    borderRadius: dt.radius.sm,
    justifyContent: 'center',
  },
  addText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  addHint: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },

  cols: { flex: 1, flexDirection: 'row', gap: dt.gap.md },
  col: { flex: 1, gap: 8 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  count: {
    minWidth: 20,
    height: 17,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
  clear: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: dt.radius.xs },
  clearText: { fontSize: 11, fontWeight: '700' },

  list: { gap: 5, paddingBottom: 40 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  emptyText: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: dt.radius.sm,
    paddingLeft: 8,
    paddingRight: 6,
    backgroundColor: dt.panel,
    borderWidth: 1,
    borderColor: dt.line,
  },
  rowMuted: { opacity: 0.62 },
  check: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: dt.ink, letterSpacing: -0.1 },
  strike: { textDecorationLine: 'line-through' },
  rowMeta: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: 1 },
  rowActions: { flexDirection: 'row', gap: 2 },
  act: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
