import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { durationLabel, fromKey, hhmm, longDay, toKey } from '../../lib/date';
import { suggestFromTitle } from '../../lib/suggest';
import { useSettings } from '../../store/settings';
import { COLOR_KEYS, EMOJIS } from '../../theme';
import type { AgendaEvent, Draft } from '../../types';
import { dt } from '../theme';
import { IconButton, Kbd, Press } from './Press';

type Props = {
  draft: Draft | null;
  dayKey: string;
  dayEvents: AgendaEvent[];
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onSelectEvent: (e: AgendaEvent) => void;
  onCreate: () => void;
};

/** Le halo bleu du navigateur autour d'un champ actif — même convention qu'ailleurs. */
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/** '9:30', '930', '9h30', '9' → minutes depuis minuit, ou null si illisible. */
function parseTime(raw: string): number | null {
  const s = raw.trim().replace(/[hH]/g, ':');
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  // '930' / '0930' : la saisie rapide sans séparateur
  const digits = s.match(/^(\d{3,4})$/);
  if (digits) {
    const n = digits[1].padStart(4, '0');
    const h = Number(n.slice(0, 2));
    const min = Number(n.slice(2));
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  return null;
}

/**
 * Le panneau de droite : la fiche, éditée sur place.
 *
 * C'est la différence la plus nette avec le mobile. Là-bas, modifier un
 * événement ouvre une feuille qui recouvre le calendrier : on ne peut pas
 * voir ce qu'on déplace pendant qu'on le déplace. Ici la fiche vit à côté
 * de la grille, et chaque frappe s'y répercute immédiatement — on choisit
 * une heure en regardant le créneau se poser entre les autres.
 *
 * D'où l'absence de bouton « enregistrer » sur le trajet normal :
 * l'enregistrement suit la saisie. Le bouton reste pour la souris, mais
 * ⌘↵ et le simple fait de cliquer ailleurs font la même chose.
 */
export function Inspector({
  draft,
  dayKey,
  dayEvents,
  onChange,
  onSave,
  onDelete,
  onClose,
  onSelectEvent,
  onCreate,
}: Props) {
  const { swatch, ui, settings } = useSettings();
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  // les champs d'heure sont libres pendant la frappe : on ne les recale
  // sur la valeur réelle que quand elle change ailleurs
  useEffect(() => {
    if (draft) {
      setStartText(hhmm(draft.start));
      setEndText(hhmm(draft.end));
    }
  }, [draft?.id, draft?.start, draft?.end]);

  const c = swatch(draft?.color ?? 'lavender');

  const commitTime = (which: 'start' | 'end', raw: string) => {
    const v = parseTime(raw);
    if (v == null || !draft) {
      // saisie illisible : on revient à la valeur en place
      if (draft) setStartText(hhmm(draft.start));
      if (draft) setEndText(hhmm(draft.end));
      return;
    }
    if (which === 'start') {
      const span = Math.max(15, draft.end - draft.start);
      onChange({ start: v, end: Math.min(1440, v + span) });
    } else {
      onChange({ end: Math.max(draft.start + 15, v) });
    }
  };

  const nudge = (which: 'start' | 'end', delta: number) => {
    if (!draft) return;
    if (which === 'start') {
      const v = Math.max(0, Math.min(1440 - 15, draft.start + delta));
      const span = Math.max(15, draft.end - draft.start);
      onChange({ start: v, end: Math.min(1440, v + span) });
    } else {
      onChange({ end: Math.max(draft.start + 15, Math.min(1440, draft.end + delta)) });
    }
  };

  /* Aucune fiche ouverte : le panneau raconte le jour choisi. */
  if (!draft) {
    const d = fromKey(dayKey);
    const busy = dayEvents.filter((e) => !e.allDay).reduce((n, e) => n + (e.end - e.start), 0);
    return (
      <View style={styles.root}>
        <View style={styles.head}>
          <Text numberOfLines={1} style={styles.headTitle}>
            {longDay(d)}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.stats}>
            <Stat value={`${dayEvents.length}`} label={dayEvents.length > 1 ? 'événements' : 'événement'} />
            <Stat value={busy ? durationLabel(0, busy) : '—'} label="occupé" />
          </View>

          {dayEvents.length === 0 ? (
            <Text style={styles.hint}>Rien de prévu ce jour-là.</Text>
          ) : (
            <View style={styles.dayList}>
              {dayEvents.map((e) => {
                const s = swatch(e.color);
                return (
                  <Press
                    key={e.id}
                    onPress={() => onSelectEvent(e)}
                    style={[styles.dayRow, { backgroundColor: s.wash, opacity: e.done ? 0.55 : 1 }]}
                  >
                    {settings.showEmoji && <Text style={styles.dayEmoji}>{e.emoji}</Text>}
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={[styles.dayTitle, { color: s.deep }]}>
                        {e.title}
                      </Text>
                      <Text style={[styles.dayTime, { color: s.deep }]}>
                        {e.allDay ? 'Toute la journée' : `${hhmm(e.start)} – ${hhmm(e.end)}`}
                      </Text>
                    </View>
                  </Press>
                );
              })}
            </View>
          )}

          <Press
            onPress={onCreate}
            style={[styles.bigBtn, { backgroundColor: `${ui.accent}14` }]}
          >
            <Ionicons name="add" size={17} color={ui.accent} />
            <Text style={[styles.bigBtnText, { color: ui.accent }]}>Nouvel événement</Text>
            <Kbd>N</Kbd>
          </Press>
        </ScrollView>
      </View>
    );
  }

  /* Une fiche est ouverte : on l'édite. */
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={[styles.headDot, { backgroundColor: c.solid }]} />
        <Text numberOfLines={1} style={styles.headTitle}>
          {draft.id ? 'Modifier' : 'Nouvel événement'}
        </Text>
        <IconButton onPress={onClose} title="Fermer (Échap)">
          <Ionicons name="close" size={16} color={dt.inkSoft} />
        </IconButton>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* titre + emoji */}
        <View style={styles.titleRow}>
          {settings.showEmoji && (
            <Press
              onPress={() => setEmojiOpen((v) => !v)}
              style={[styles.emojiBtn, { backgroundColor: c.wash }]}
              title="Changer l'emoji"
            >
              <Text style={styles.emojiBig}>{draft.emoji}</Text>
            </Press>
          )}
          <TextInput
            value={draft.title}
            onChangeText={(title) => {
              const patch: Partial<Draft> = { title };
              // la couleur suit ce qu'on écrit, tant qu'on n'y a pas touché
              if (settings.autoColor && !draft.id) {
                const guess = suggestFromTitle(title);
                if (guess) Object.assign(patch, guess);
              }
              onChange(patch);
            }}
            placeholder="Titre"
            placeholderTextColor={dt.inkFaint}
            style={[styles.titleInput, noOutline]}
            autoFocus={!draft.id}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
        </View>

        {emojiOpen && (
          <View style={styles.emojiGrid}>
            {EMOJIS.map((e) => (
              <Press
                key={e}
                onPress={() => {
                  onChange({ emoji: e });
                  setEmojiOpen(false);
                }}
                style={[styles.emojiCell, draft.emoji === e && { backgroundColor: c.wash }]}
              >
                <Text style={styles.emojiSmall}>{e}</Text>
              </Press>
            ))}
          </View>
        )}

        {/* couleurs */}
        <View style={styles.swatches}>
          {COLOR_KEYS.map((k) => {
            const s = swatch(k);
            return (
              <Press
                key={k}
                onPress={() => onChange({ color: k })}
                title={s.label}
                style={[
                  styles.swatch,
                  { backgroundColor: s.solid },
                  draft.color === k && styles.swatchOn,
                ]}
              />
            );
          })}
        </View>

        <Field label="Date">
          <TextInput
            value={draft.date}
            onChangeText={(date) => onChange({ date })}
            onBlur={() => {
              // une date illisible revient au jour affiché
              const d = fromKey(draft.date);
              if (Number.isNaN(d.getTime())) onChange({ date: dayKey });
              else onChange({ date: toKey(d) });
            }}
            style={[styles.input, noOutline]}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={dt.inkFaint}
          />
        </Field>

        <Press
          onPress={() => onChange({ allDay: !draft.allDay })}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleLabel}>Toute la journée</Text>
          <View style={[styles.toggle, draft.allDay && { backgroundColor: ui.accent }]}>
            <View style={[styles.knob, draft.allDay && styles.knobOn]} />
          </View>
        </Press>

        {!draft.allDay && (
          <View style={styles.times}>
            <TimeField
              label="Début"
              value={startText}
              onChangeText={setStartText}
              onCommit={() => commitTime('start', startText)}
              onNudge={(d) => nudge('start', d)}
            />
            <TimeField
              label="Fin"
              value={endText}
              onChangeText={setEndText}
              onCommit={() => commitTime('end', endText)}
              onNudge={(d) => nudge('end', d)}
            />
          </View>
        )}

        {!draft.allDay && (
          <Text style={styles.duration}>{durationLabel(draft.start, draft.end)}</Text>
        )}

        <Field label="Lieu">
          <TextInput
            value={draft.location}
            onChangeText={(location) => onChange({ location })}
            style={[styles.input, noOutline]}
            placeholder="—"
            placeholderTextColor={dt.inkFaint}
          />
        </Field>

        <Field label="Notes">
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => onChange({ notes })}
            style={[styles.input, styles.notes, noOutline]}
            multiline
            placeholder="—"
            placeholderTextColor={dt.inkFaint}
          />
        </Field>

        <View style={styles.actions}>
          <Press
            onPress={onSave}
            style={[styles.primary, { backgroundColor: ui.accent }]}
          >
            <Text style={styles.primaryText}>Enregistrer</Text>
            <Text style={styles.primaryHint}>⌘↵</Text>
          </Press>
          {draft.id && (
            <>
              <Press onPress={() => onChange({ done: !draft.done })} style={styles.ghostBtn}>
                <Ionicons
                  name={draft.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={draft.done ? swatch('mint').solid : dt.inkSoft}
                />
                <Text style={styles.ghostText}>{draft.done ? 'Fait' : 'Marquer fait'}</Text>
              </Press>
              <Press onPress={onDelete} style={styles.ghostBtn}>
                <Ionicons name="trash-outline" size={15} color={swatch('blush').solid} />
                <Text style={[styles.ghostText, { color: swatch('blush').deep }]}>Supprimer</Text>
              </Press>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Une heure : au clavier pour aller vite, aux flèches pour ajuster. */
function TimeField({
  label,
  value,
  onChangeText,
  onCommit,
  onNudge,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onCommit: () => void;
  onNudge: (delta: number) => void;
}) {
  return (
    <View style={styles.timeField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onCommit}
          onSubmitEditing={onCommit}
          style={[styles.input, styles.timeInput, noOutline]}
          placeholder="00:00"
          placeholderTextColor={dt.inkFaint}
        />
        <View style={styles.steppers}>
          <Press onPress={() => onNudge(15)} style={styles.stepper} title="+ 15 min">
            <Ionicons name="chevron-up" size={12} color={dt.inkSoft} />
          </Press>
          <Press onPress={() => onNudge(-15)} style={styles.stepper} title="− 15 min">
            <Ionicons name="chevron-down" size={12} color={dt.inkSoft} />
          </Press>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dt.panel, borderLeftWidth: 1, borderLeftColor: dt.line },
  flex: { flex: 1 },
  head: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  headDot: { width: 8, height: 8, borderRadius: 4 },
  headTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: dt.ink, letterSpacing: -0.2 },
  body: { padding: dt.gap.md, gap: dt.gap.md, paddingBottom: 40 },

  stats: { flexDirection: 'row', gap: dt.gap.sm },
  stat: { flex: 1, backgroundColor: dt.sunken, borderRadius: dt.radius.sm, padding: 10 },
  statValue: { fontSize: 19, fontWeight: '800', color: dt.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: 1 },
  hint: { fontSize: 12.5, color: dt.inkFaint, fontWeight: '600' },

  dayList: { gap: 5 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: dt.radius.sm,
    padding: 8,
  },
  dayEmoji: { fontSize: 15 },
  dayTitle: { fontSize: 12.5, fontWeight: '700' },
  dayTime: { fontSize: 10.5, fontWeight: '600', opacity: 0.85, fontVariant: ['tabular-nums'] },

  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: dt.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bigBtnText: { flex: 1, fontSize: 12.5, fontWeight: '700' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiBtn: { width: 38, height: 38, borderRadius: dt.radius.sm, alignItems: 'center', justifyContent: 'center' },
  emojiBig: { fontSize: 19 },
  titleInput: {
    flex: 1,
    height: 38,
    fontSize: 15,
    fontWeight: '700',
    color: dt.ink,
    letterSpacing: -0.3,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
    backgroundColor: dt.sunken,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  emojiCell: { width: 32, height: 32, borderRadius: dt.radius.xs, alignItems: 'center', justifyContent: 'center' },
  emojiSmall: { fontSize: 16 },

  swatches: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: 'transparent' },
  swatchOn: { borderColor: dt.panel, transform: [{ scale: 1.18 }] },

  field: { gap: 4 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 32,
    borderRadius: dt.radius.sm,
    backgroundColor: dt.sunken,
    paddingHorizontal: 10,
    fontSize: 12.5,
    fontWeight: '600',
    color: dt.ink,
  },
  notes: { height: 66, paddingTop: 8, textAlignVertical: 'top' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: dt.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  toggleLabel: { fontSize: 12.5, fontWeight: '600', color: dt.ink },
  toggle: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: dt.lineStrong,
    padding: 2,
    justifyContent: 'center',
  },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
  knobOn: { transform: [{ translateX: 16 }] },

  times: { flexDirection: 'row', gap: dt.gap.sm },
  timeField: { flex: 1, gap: 4 },
  timeRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  timeInput: { flex: 1, fontVariant: ['tabular-nums'], fontWeight: '700' },
  steppers: { gap: 2 },
  stepper: {
    width: 20,
    height: 15,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dt.sunken,
  },
  duration: { fontSize: 11.5, fontWeight: '700', color: dt.inkFaint, marginTop: -6 },

  actions: { gap: 6, marginTop: 4 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    borderRadius: dt.radius.sm,
  },
  primaryText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  primaryHint: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 32,
    borderRadius: dt.radius.sm,
    paddingHorizontal: 10,
  },
  ghostText: { fontSize: 12.5, fontWeight: '600', color: dt.inkSoft },
});
