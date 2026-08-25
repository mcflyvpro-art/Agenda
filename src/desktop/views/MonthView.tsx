import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fromKey,
  getISOWeek,
  hhmm,
  isSameMonth,
  isWeekend,
  monthMatrix,
  toKey,
  todayKey,
  weekdayLabels,
} from '../../lib/date';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { useDeskPrefs } from '../store/prefs';
import { dt } from '../theme';
import { Press } from '../parts/Press';

const WEEKNUM = 26;
const HEAD = 26;

type Props = {
  month: Date;
  eventsOn: (key: string) => AgendaEvent[];
  selectedKey: string;
  selectedId?: string | null;
  onSelectDay: (key: string) => void;
  onSelectEvent: (e: AgendaEvent) => void;
  onCreate: (dateKey: string) => void;
};

/**
 * Le mois en grand.
 *
 * Sur téléphone, une case de mois n'a la place que d'une pastille de
 * couleur : il faut ouvrir le jour pour savoir ce qu'il contient. Ici la
 * case fait cent pixels de haut et affiche les événements en clair,
 * heure et titre. C'est tout l'intérêt de l'écran large, et ça change la
 * nature de la vue — on ne navigue plus vers l'information, on la lit.
 */
export function MonthView({
  month,
  eventsOn,
  selectedKey,
  selectedId,
  onSelectDay,
  onSelectEvent,
  onCreate,
}: Props) {
  const { settings, swatch, ui } = useSettings();
  const { prefs } = useDeskPrefs();
  const [rowH, setRowH] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const cells = useMemo(
    () => monthMatrix(month, settings.weekStart),
    [month, settings.weekStart],
  );
  const labels = weekdayLabels(settings.weekStart);
  const today = todayKey();

  const rows = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    // une sixième ligne entièrement hors du mois n'apprend rien : on la coupe
    const last = out[out.length - 1];
    if (last && last.every((d) => !isSameMonth(d, month))) out.pop();
    return out;
  }, [cells, month]);

  const days = prefs.showWeekends ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  /** combien d'événements tiennent dans une case, à la hauteur qu'elle a */
  const fit = Math.max(1, Math.floor((rowH - HEAD - 6) / 19));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {prefs.showWeekNumbers && <View style={{ width: WEEKNUM }} />}
        {days.map((i) => (
          <Text key={i} style={styles.headText}>
            {labels[i]}
          </Text>
        ))}
      </View>

      <View
        style={styles.grid}
        onLayout={(e) => setRowH(e.nativeEvent.layout.height / Math.max(1, rows.length))}
      >
        {rows.map((week, r) => (
          <View key={r} style={styles.row}>
            {prefs.showWeekNumbers && (
              <View style={styles.weekNum}>
                <Text style={styles.weekNumText}>{getISOWeek(week[0])}</Text>
              </View>
            )}
            {days.map((i) => {
              const d = week[i];
              const key = toKey(d);
              const list = eventsOn(key);
              const inMonth = isSameMonth(d, month);
              const isToday = key === today;
              const isSel = key === selectedKey;
              const shown = list.slice(0, list.length > fit ? fit - 1 : fit);
              const rest = list.length - shown.length;

              return (
                <Press
                  key={key}
                  onPress={() => onSelectDay(key)}
                  style={[
                    styles.cell,
                    r > 0 && styles.cellTop,
                    i > days[0] && styles.cellLeft,
                    !inMonth && styles.outside,
                    settings.dimWeekend && isWeekend(d) && inMonth ? styles.weekend : null,
                    isSel && { backgroundColor: `${ui.accent}0D` },
                  ]}
                  hoverStyle={{ backgroundColor: dt.hover }}
                >
                  <View style={styles.cellHead}>
                    <View
                      style={[styles.num, isToday && { backgroundColor: ui.today }]}
                    >
                      <Text
                        style={[
                          styles.numText,
                          !inMonth && styles.numOut,
                          isToday && styles.numToday,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                    {/* le bouton n'apparaît qu'au survol : il ne meuble pas la case */}
                    {hovered === key && (
                      <Press
                        onPress={() => onCreate(key)}
                        title="Nouvel événement"
                        style={styles.add}
                      >
                        <Text style={[styles.addText, { color: ui.accent }]}>+</Text>
                      </Press>
                    )}
                  </View>

                  <View
                    style={styles.chips}
                    // @ts-expect-error — react-native-web transmet ces gestionnaires au DOM
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
                  >
                    {shown.map((e) => {
                      const c = swatch(e.color);
                      const sel = e.id === selectedId;
                      return (
                        <Press
                          key={e.id}
                          onPress={() => onSelectEvent(e)}
                          title={`${e.title} · ${e.allDay ? 'toute la journée' : hhmm(e.start)}`}
                          style={[
                            styles.chip,
                            { backgroundColor: c.wash, opacity: e.done ? 0.55 : 1 },
                            sel && { borderColor: c.solid },
                          ]}
                        >
                          {!e.allDay && (
                            <Text style={[styles.chipTime, { color: c.deep }]}>
                              {hhmm(e.start)}
                            </Text>
                          )}
                          <Text numberOfLines={1} style={[styles.chipTitle, { color: c.deep }]}>
                            {settings.showEmoji ? `${e.emoji} ` : ''}
                            {e.title}
                          </Text>
                        </Press>
                      );
                    })}
                    {rest > 0 && (
                      <Press onPress={() => onSelectDay(key)} style={styles.more}>
                        <Text style={styles.moreText}>{`+ ${rest} autre${rest > 1 ? 's' : ''}`}</Text>
                      </Press>
                    )}
                  </View>
                </Press>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: HEAD, flexDirection: 'row', alignItems: 'center' },
  headText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: { flex: 1, borderTopWidth: 1, borderTopColor: dt.line },
  row: { flex: 1, flexDirection: 'row' },
  weekNum: { width: WEEKNUM, alignItems: 'center', paddingTop: 7 },
  weekNumText: { fontSize: 9.5, fontWeight: '700', color: dt.inkFaint },
  cell: { flex: 1, paddingHorizontal: 4, paddingBottom: 3, overflow: 'hidden' },
  cellTop: { borderTopWidth: 1, borderTopColor: dt.line },
  cellLeft: { borderLeftWidth: 1, borderLeftColor: dt.line },
  outside: { backgroundColor: 'rgba(32,32,43,0.02)' },
  weekend: { backgroundColor: 'rgba(32,32,43,0.015)' },

  cellHead: {
    height: HEAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  num: {
    minWidth: 21,
    height: 21,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 12.5, fontWeight: '700', color: dt.ink },
  numOut: { color: dt.inkFaint, fontWeight: '600' },
  numToday: { color: '#FFFFFF' },
  add: { width: 19, height: 19, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '700', lineHeight: 17 },

  chips: { flex: 1, gap: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 17,
    borderRadius: dt.radius.xs,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipTime: { fontSize: 9.5, fontWeight: '800', fontVariant: ['tabular-nums'], opacity: 0.75 },
  chipTitle: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: -0.1 },
  more: { height: 15, justifyContent: 'center', paddingHorizontal: 5 },
  moreText: { fontSize: 10, fontWeight: '700', color: dt.inkFaint },
});
