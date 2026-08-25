import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  addDays,
  durationLabel,
  fromKey,
  hhmm,
  longDay,
  relativeDayLabel,
  toKey,
  todayKey,
} from '../../lib/date';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { dt } from '../theme';
import { Press } from '../parts/Press';

/** Fenêtre montrée par la liste, autour du jour choisi. */
const BEFORE = 7;
const AFTER = 120;

type Props = {
  anchorKey: string;
  eventsOn: (key: string) => AgendaEvent[];
  selectedId?: string | null;
  onSelectEvent: (e: AgendaEvent) => void;
  onSelectDay: (key: string) => void;
  onCreate: (dateKey: string) => void;
};

/**
 * Tout ce qui vient, à la file.
 *
 * Les jours vides sont sautés : une liste n'a pas à rendre compte du
 * calendrier, seulement de ce qu'il contient. La colonne de gauche fixe
 * la date une fois pour toutes, ce qui laisse toute la largeur au
 * contenu — l'inverse du mobile, où la date doit coiffer chaque groupe
 * faute de place à côté.
 */
export function ListView({
  anchorKey,
  eventsOn,
  selectedId,
  onSelectEvent,
  onSelectDay,
  onCreate,
}: Props) {
  const { swatch, settings, ui } = useSettings();
  const today = todayKey();

  const groups = useMemo(() => {
    const start = addDays(fromKey(anchorKey), -BEFORE);
    const out: { key: string; list: AgendaEvent[] }[] = [];
    for (let i = 0; i < BEFORE + AFTER; i++) {
      const key = toKey(addDays(start, i));
      const list = eventsOn(key);
      if (list.length) out.push({ key, list });
    }
    return out;
  }, [anchorKey, eventsOn]);

  if (!groups.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Rien de prévu sur cette période.</Text>
        <Press
          onPress={() => onCreate(anchorKey)}
          style={[styles.emptyBtn, { backgroundColor: `${ui.accent}14` }]}
        >
          <Text style={[styles.emptyBtnText, { color: ui.accent }]}>Ajouter un événement</Text>
        </Press>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {groups.map(({ key, list }) => {
        const d = fromKey(key);
        const isToday = key === today;
        return (
          <View key={key} style={styles.group}>
            <Press onPress={() => onSelectDay(key)} style={styles.dateCol}>
              <Text style={[styles.dateNum, isToday && { color: ui.today }]}>{d.getDate()}</Text>
              <Text style={[styles.dateDay, isToday && { color: ui.today }]}>
                {relativeDayLabel(key) === longDay(d)
                  ? longDay(d).split(' ')[0]
                  : relativeDayLabel(key)}
              </Text>
            </Press>

            <View style={styles.rows}>
              {list.map((e) => {
                const c = swatch(e.color);
                const sel = e.id === selectedId;
                return (
                  <Press
                    key={e.id}
                    onPress={() => onSelectEvent(e)}
                    style={[
                      styles.row,
                      { backgroundColor: c.wash, opacity: e.done ? 0.55 : 1 },
                      sel && { borderColor: c.solid },
                    ]}
                  >
                    <View style={[styles.bar, { backgroundColor: c.solid }]} />
                    {settings.showEmoji && <Text style={styles.emoji}>{e.emoji}</Text>}
                    <Text numberOfLines={1} style={[styles.title, { color: c.deep }]}>
                      {e.title}
                    </Text>
                    <Text style={[styles.time, { color: c.deep }]}>
                      {e.allDay
                        ? 'Toute la journée'
                        : `${hhmm(e.start)} – ${hhmm(e.end)} · ${durationLabel(e.start, e.end)}`}
                    </Text>
                  </Press>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: dt.gap.lg, gap: dt.gap.md, paddingBottom: 80 },
  group: { flexDirection: 'row', gap: dt.gap.md },
  dateCol: { width: 96, alignItems: 'flex-end', paddingTop: 6, borderRadius: dt.radius.sm },
  dateNum: { fontSize: 22, fontWeight: '800', color: dt.ink, letterSpacing: -0.8 },
  dateDay: { fontSize: 11, fontWeight: '700', color: dt.inkFaint, textTransform: 'capitalize' },
  rows: { flex: 1, gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    borderRadius: dt.radius.sm,
    paddingLeft: 12,
    paddingRight: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5 },
  emoji: { fontSize: 15 },
  title: { flex: 1, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  time: { fontSize: 11.5, fontWeight: '600', opacity: 0.85, fontVariant: ['tabular-nums'] },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: dt.gap.md },
  emptyText: { fontSize: 13.5, color: dt.inkSoft, fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: dt.radius.sm },
  emptyBtnText: { fontSize: 13, fontWeight: '700' },
});
