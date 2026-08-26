import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
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
import type { ColorKey, Swatch } from '../../theme';
import type { AgendaEvent } from '../../types';
import { useDeskPrefs } from '../store/prefs';
import { alpha, dt } from '../theme';
import { Press } from '../parts/Press';

const WEEKNUM = 28;
const HEAD = 28;
/** hauteur d'une pastille d'événement, gouttière comprise */
const CHIP = 19;

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
  const fit = Math.max(1, Math.floor((rowH - HEAD - 6) / CHIP));

  const onLayout = useCallback(
    (e: any) => setRowH(e.nativeEvent.layout.height / Math.max(1, rows.length)),
    [rows.length],
  );

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

      <View style={styles.grid} onLayout={onLayout}>
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
              return (
                <DayCell
                  key={key}
                  date={d}
                  dateKey={key}
                  list={eventsOn(key)}
                  fit={fit}
                  first={i === days[0]}
                  firstRow={r === 0}
                  inMonth={isSameMonth(d, month)}
                  isToday={key === today}
                  isSelected={key === selectedKey}
                  selectedId={selectedId ?? null}
                  dim={settings.dimWeekend && isWeekend(d)}
                  showEmoji={settings.showEmoji}
                  accent={ui.accent}
                  todayColor={ui.today}
                  swatch={swatch}
                  onSelectDay={onSelectDay}
                  onSelectEvent={onSelectEvent}
                  onCreate={onCreate}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Une case du mois.
 *
 * Le bouton « + » n'apparaît qu'au survol, et c'est justement pourquoi la
 * case est un composant à part : gardé dans la vue, l'état de survol
 * redessinerait les trente-cinq autres cases à chaque déplacement du
 * curseur — soit, en travers d'une grille, quelques centaines de rendus
 * inutiles pour un seul petit bouton qui s'allume.
 */
const DayCell = React.memo(function DayCell({
  date,
  dateKey,
  list,
  fit,
  first,
  firstRow,
  inMonth,
  isToday,
  isSelected,
  selectedId,
  dim,
  showEmoji,
  accent,
  todayColor,
  swatch,
  onSelectDay,
  onSelectEvent,
  onCreate,
}: {
  date: Date;
  dateKey: string;
  list: AgendaEvent[];
  fit: number;
  first: boolean;
  firstRow: boolean;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  selectedId: string | null;
  dim: boolean;
  showEmoji: boolean;
  accent: string;
  todayColor: string;
  swatch: (k: ColorKey) => Swatch;
  onSelectDay: (key: string) => void;
  onSelectEvent: (e: AgendaEvent) => void;
  onCreate: (key: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const onHoverChange = useCallback((h: boolean) => setHover(h), []);

  const shown = list.slice(0, list.length > fit ? fit - 1 : fit);
  const rest = list.length - shown.length;

  return (
    <Press
      onPress={() => onSelectDay(dateKey)}
      onHoverChange={onHoverChange}
      style={
        [
          styles.cell,
          !firstRow && styles.cellTop,
          !first && styles.cellLeft,
          !inMonth && styles.outside,
          dim && inMonth && styles.weekend,
          isSelected && {
            backgroundColor: alpha(accent, 0.06),
            boxShadow: `inset 0 0 0 1.5px ${alpha(accent, 0.35)}`,
          },
        ] as any
      }
      hoverStyle={isSelected ? null : styles.cellHover}
    >
      <View style={styles.cellHead}>
        <View
          style={
            [
              styles.num,
              isToday && {
                backgroundColor: todayColor,
                boxShadow: `0 2px 7px -2px ${alpha(todayColor, 0.7)}`,
              },
            ] as any
          }
        >
          <Text style={[styles.numText, !inMonth && styles.numOut, isToday && styles.numToday]}>
            {date.getDate()}
          </Text>
        </View>
        {/* le bouton n'apparaît qu'au survol : il ne meuble pas la case */}
        {hover && (
          <Press
            onPress={() => onCreate(dateKey)}
            title="Nouvel événement"
            style={[styles.add, { backgroundColor: alpha(accent, 0.13) }]}
            sink
          >
            <Text style={[styles.addText, { color: accent }]}>+</Text>
          </Press>
        )}
      </View>

      <View style={styles.chips}>
        {shown.map((e) => {
          const c = swatch(e.color);
          const sel = e.id === selectedId;
          return (
            <Press
              key={e.id}
              onPress={() => onSelectEvent(e)}
              kind="event"
              title={`${e.title} · ${e.allDay ? 'toute la journée' : hhmm(e.start)}`}
              style={
                [
                  styles.chip,
                  { backgroundColor: c.wash, opacity: e.done ? 0.5 : 1 },
                  sel && { boxShadow: `0 0 0 1.5px ${c.solid}` },
                ] as any
              }
              hoverStyle={{ backgroundColor: alpha(c.solid, 0.26) }}
            >
              <View style={[styles.chipBar, { backgroundColor: c.solid }]} />
              {!e.allDay && (
                <Text style={[styles.chipTime, { color: c.deep }]}>{hhmm(e.start)}</Text>
              )}
              <Text
                numberOfLines={1}
                style={[styles.chipTitle, { color: c.deep }, e.done && styles.strike]}
              >
                {showEmoji ? `${e.emoji} ` : ''}
                {e.title}
              </Text>
            </Press>
          );
        })}
        {rest > 0 && (
          <Press onPress={() => onSelectDay(dateKey)} style={styles.more}>
            <Text style={styles.moreText}>{`+ ${rest} autre${rest > 1 ? 's' : ''}`}</Text>
          </Press>
        )}
      </View>
    </Press>
  );
});

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
    letterSpacing: 0.7,
  },
  grid: { flex: 1, borderTopWidth: 1, borderTopColor: dt.line },
  row: { flex: 1, flexDirection: 'row' },
  weekNum: { width: WEEKNUM, alignItems: 'center', paddingTop: 9 },
  weekNumText: { fontSize: 9.5, fontWeight: '700', color: dt.inkFaint, fontVariant: ['tabular-nums'] },

  cell: { flex: 1, paddingHorizontal: 5, paddingBottom: 3, overflow: 'hidden' },
  cellTop: { borderTopWidth: 1, borderTopColor: dt.line },
  cellLeft: { borderLeftWidth: 1, borderLeftColor: dt.line },
  cellHover: { backgroundColor: dt.hover },
  outside: { backgroundColor: 'rgba(32,32,43,0.022)' },
  weekend: { backgroundColor: 'rgba(32,32,43,0.014)' },

  cellHead: {
    height: HEAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  num: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 12.5, fontWeight: '700', color: dt.ink, fontVariant: ['tabular-nums'] },
  numOut: { color: dt.inkFaint, fontWeight: '600' },
  numToday: { color: '#FFFFFF', fontWeight: '800' },
  add: { width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '700', lineHeight: 17 },

  chips: { flex: 1, gap: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: CHIP - 2,
    borderRadius: dt.radius.xs,
    paddingLeft: 7,
    paddingRight: 6,
    overflow: 'hidden',
  },
  chipBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5 },
  chipTime: { fontSize: 9.5, fontWeight: '800', fontVariant: ['tabular-nums'], opacity: 0.75 },
  chipTitle: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: -0.1 },
  strike: { textDecorationLine: 'line-through' },
  more: { height: 15, justifyContent: 'center', paddingHorizontal: 7, borderRadius: dt.radius.xs },
  moreText: { fontSize: 10, fontWeight: '700', color: dt.inkFaint },
});
