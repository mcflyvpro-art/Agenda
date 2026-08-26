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
import { alpha, dt } from '../theme';
import { Appear, stagger } from '../parts/Motion';
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
        <Text style={styles.emptyIcon}>◦</Text>
        <Text style={styles.emptyText}>Rien de prévu sur cette période.</Text>
        <Press
          onPress={() => onCreate(anchorKey)}
          style={[styles.emptyBtn, { backgroundColor: alpha(ui.accent, 0.1) }]}
          hoverStyle={{ backgroundColor: alpha(ui.accent, 0.17) }}
        >
          <Text style={[styles.emptyBtnText, { color: ui.accent }]}>Ajouter un événement</Text>
        </Press>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {groups.map(({ key, list }, gi) => {
        const d = fromKey(key);
        const isToday = key === today;
        const label = relativeDayLabel(key);
        return (
          <Appear key={key} delay={stagger(gi, 22, 180)} style={styles.group}>
            <Press onPress={() => onSelectDay(key)} style={styles.dateCol} hoverStyle={null}>
              <Text style={[styles.dateNum, isToday && { color: ui.today }]}>{d.getDate()}</Text>
              <Text style={[styles.dateDay, isToday && { color: ui.today }]}>
                {label === longDay(d) ? longDay(d).split(' ')[0] : label}
              </Text>
            </Press>

            {/* le fil vertical qui relie les événements d'un même jour */}
            <View style={styles.spine}>
              <View
                style={[
                  styles.spineDot,
                  { backgroundColor: isToday ? ui.today : dt.lineStrong },
                ]}
              />
              <View style={styles.spineLine} />
            </View>

            <View style={styles.rows}>
              {list.map((e) => {
                const c = swatch(e.color);
                const sel = e.id === selectedId;
                return (
                  <Press
                    key={e.id}
                    onPress={() => onSelectEvent(e)}
                    kind="card"
                    style={
                      [
                        styles.row,
                        {
                          backgroundColor: c.wash,
                          opacity: e.done ? 0.5 : 1,
                          boxShadow: sel
                            ? `0 0 0 1.5px ${c.solid}, 0 2px 6px -2px ${alpha(c.deep, 0.28)}`
                            : `0 1px 2px ${alpha(c.deep, 0.08)}`,
                        },
                      ] as any
                    }
                    hoverStyle={
                      {
                        transform: [{ translateY: -1 }],
                        boxShadow: sel
                          ? `0 0 0 1.5px ${c.solid}, 0 8px 18px -8px ${alpha(c.deep, 0.4)}`
                          : `0 2px 4px ${alpha(c.deep, 0.12)}, 0 10px 20px -10px ${alpha(c.deep, 0.34)}`,
                      } as any
                    }
                  >
                    <View style={[styles.bar, { backgroundColor: c.solid }]} />
                    {settings.showEmoji && <Text style={styles.emoji}>{e.emoji}</Text>}
                    <Text
                      numberOfLines={1}
                      style={[styles.title, { color: c.deep }, e.done && styles.strike]}
                    >
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
          </Appear>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: dt.gap.lg, gap: dt.gap.md, paddingBottom: 80 },
  group: { flexDirection: 'row', gap: dt.gap.sm },

  dateCol: {
    width: 92,
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingRight: 4,
    borderRadius: dt.radius.sm,
  },
  dateNum: {
    fontSize: 23,
    fontWeight: '800',
    color: dt.ink,
    letterSpacing: -0.9,
    fontVariant: ['tabular-nums'],
  },
  dateDay: { fontSize: 11, fontWeight: '700', color: dt.inkFaint, textTransform: 'capitalize' },

  /* le fil du jour : une verticale discrète qui tient les rangées ensemble */
  spine: { width: 11, alignItems: 'center', paddingTop: 12 },
  spineDot: { width: 7, height: 7, borderRadius: 4 },
  spineLine: { flex: 1, width: 1, backgroundColor: dt.line, marginTop: 3 },

  rows: { flex: 1, gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: dt.radius.sm,
    paddingLeft: 13,
    paddingRight: 14,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5 },
  emoji: { fontSize: 15 },
  title: { flex: 1, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  strike: { textDecorationLine: 'line-through' },
  time: { fontSize: 11.5, fontWeight: '600', opacity: 0.85, fontVariant: ['tabular-nums'] },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: dt.gap.sm },
  emptyIcon: { fontSize: 30, color: dt.inkFaint, opacity: 0.5, marginBottom: 2 },
  emptyText: { fontSize: 13.5, color: dt.inkSoft, fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: dt.radius.sm, marginTop: 4 },
  emptyBtnText: { fontSize: 13, fontWeight: '700' },
});
