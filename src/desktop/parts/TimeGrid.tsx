import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fromKey, hhmm, isWeekend, minutesNow, shortDay, todayKey } from '../../lib/date';
import { layoutDay } from '../../lib/layout';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { dt } from '../theme';
import { Press } from './Press';

const GUTTER = 58;
const HEAD = 46;
const ALLDAY_ROW = 26;
/** pas de la grille à la création : le quart d'heure, comme partout ailleurs */
const STEP = 15;
/** en deçà, un glissement est un clic : on crée alors une heure par défaut */
const DRAG_SLOP = 6;

type Props = {
  days: string[];
  eventsOn: (key: string) => AgendaEvent[];
  startHour: number;
  endHour: number;
  hourHeight: number;
  selectedId?: string | null;
  onSelectEvent: (e: AgendaEvent) => void;
  /** création : un clic sur une case vide, ou un glissement pour une plage */
  onCreate: (dateKey: string, start: number, end: number) => void;
  onSelectDay?: (key: string) => void;
  showNow?: boolean;
};

/**
 * La grille horaire du bureau.
 *
 * Deux choses la distinguent de son équivalent mobile. D'abord elle défile
 * nativement : la molette et le glissement à deux doigts du trackpad
 * suffisent, il n'y a rien à saisir ni à faire glisser à la main. Ensuite
 * elle se dessine dessus — on trace un créneau au curseur comme on
 * surlignerait une plage horaire sur un agenda papier, ce qu'un doigt ne
 * peut pas faire avec assez de précision pour que ça vaille la peine sur
 * un téléphone.
 */
export function TimeGrid({
  days,
  eventsOn,
  startHour,
  endHour,
  hourHeight,
  selectedId,
  onSelectEvent,
  onCreate,
  onSelectDay,
  showNow = true,
}: Props) {
  const { swatch, ui, settings } = useSettings();
  const bodyRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [now, setNow] = useState(minutesNow);
  /** le créneau qu'on est en train de tracer */
  const [ghost, setGhost] = useState<{ col: number; from: number; to: number } | null>(null);

  const hours = Math.max(1, endHour - startHour);
  const bodyH = hours * hourHeight;
  const colW = days.length ? Math.max(0, (width - GUTTER) / days.length) : 0;
  const today = todayKey();

  useEffect(() => {
    if (!showNow) return;
    const t = setInterval(() => setNow(minutesNow()), 30_000);
    return () => clearInterval(t);
  }, [showNow]);

  // à l'ouverture, on se pose sur l'heure courante plutôt qu'à minuit
  useEffect(() => {
    const target = ((now - startHour * 60) / 60) * hourHeight - 180;
    scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutesAt = useCallback(
    (offsetY: number) => {
      const raw = startHour * 60 + (offsetY / hourHeight) * 60;
      return Math.max(startHour * 60, Math.min(endHour * 60, Math.round(raw / STEP) * STEP));
    },
    [startHour, endHour, hourHeight],
  );

  /*
    Tracer un créneau. On écoute le pointeur sur la fenêtre plutôt que sur
    la grille : une fois le glissement commencé, le curseur sort volontiers
    du cadre, et un écouteur local perdrait le geste en route sans jamais
    recevoir le relâchement.
  */
  const onDown = useCallback(
    (e: any) => {
      const node: HTMLElement | null = bodyRef.current;
      if (!node || e.button !== 0) return;
      const box = node.getBoundingClientRect();
      const x = e.clientX - box.left - GUTTER;
      const y = e.clientY - box.top;
      if (x < 0 || colW <= 0) return;
      const col = Math.min(days.length - 1, Math.floor(x / colW));
      const from = minutesAt(y);
      const startClientY = e.clientY;
      let moved = false;

      setGhost({ col, from, to: from + 60 });
      onSelectDay?.(days[col]);

      const move = (ev: PointerEvent) => {
        if (Math.abs(ev.clientY - startClientY) > DRAG_SLOP) moved = true;
        const to = minutesAt(ev.clientY - box.top);
        setGhost({ col, from: Math.min(from, to), to: Math.max(from, to) });
      };

      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const to = minutesAt(ev.clientY - box.top);
        setGhost(null);
        // un simple clic vaut une heure ; un glissement, la plage tracée
        const a = moved ? Math.min(from, to) : from;
        const b = moved ? Math.max(from, to) : from + 60;
        onCreate(days[col], a, Math.max(a + STEP, Math.min(endHour * 60, b)));
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [colW, days, minutesAt, onCreate, onSelectDay, endHour],
  );

  useEffect(() => {
    const node: HTMLElement | null = bodyRef.current;
    if (!node || typeof window === 'undefined') return;
    node.addEventListener('pointerdown', onDown);
    return () => node.removeEventListener('pointerdown', onDown);
  }, [onDown]);

  const allDay = useMemo(
    () => days.map((k) => eventsOn(k).filter((e) => e.allDay)),
    [days, eventsOn],
  );
  const hasAllDay = allDay.some((l) => l.length > 0);

  const hourList = Array.from({ length: hours + 1 }, (_, i) => startHour + i);

  return (
    <View style={styles.root} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* en-têtes de jour — fixes, la grille défile dessous */}
      <View style={styles.head}>
        <View style={{ width: GUTTER }} />
        {days.map((key, i) => {
          const d = fromKey(key);
          const isToday = key === today;
          return (
            <Press
              key={key}
              onPress={() => onSelectDay?.(key)}
              style={[
                styles.headCell,
                { width: colW },
                i > 0 ? styles.headSep : null,
                settings.dimWeekend && isWeekend(d) ? styles.dim : null,
              ]}
            >
              <Text style={[styles.headDay, isToday && { color: ui.today }]}>{shortDay(d)}</Text>
              <View
                style={[styles.headNum, isToday && { backgroundColor: ui.today }]}
              >
                <Text style={[styles.headNumText, isToday && styles.headNumToday]}>
                  {d.getDate()}
                </Text>
              </View>
            </Press>
          );
        })}
      </View>

      {/* la bande du haut n'apparaît que s'il y a quelque chose à y mettre */}
      {hasAllDay && (
        <View style={styles.allDay}>
          <Text style={styles.allDayLabel}>jour</Text>
          {allDay.map((list, i) => (
            <View key={days[i]} style={[styles.allDayCell, { width: colW }]}>
              {list.map((e) => {
                const c = swatch(e.color);
                return (
                  <Press
                    key={e.id}
                    onPress={() => onSelectEvent(e)}
                    style={[styles.allDayChip, { backgroundColor: c.wash }]}
                  >
                    <Text numberOfLines={1} style={[styles.allDayText, { color: c.deep }]}>
                      {settings.showEmoji ? `${e.emoji} ` : ''}
                      {e.title}
                    </Text>
                  </Press>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ height: bodyH }}
        showsVerticalScrollIndicator={false}
      >
        <View ref={bodyRef} style={[styles.body, { height: bodyH }]}>
          {/* lignes des heures */}
          {hourList.map((h, i) => (
            <View key={h} style={[styles.hourRow, { top: i * hourHeight }]}>
              <Text style={styles.hourLabel}>{`${`${h}`.padStart(2, '0')}:00`}</Text>
              <View style={styles.hourLine} />
            </View>
          ))}
          {/* demi-heures : un repère plus léger, utile quand l'heure est haute */}
          {hourHeight >= 44 &&
            hourList.slice(0, -1).map((h, i) => (
              <View
                key={`half-${h}`}
                style={[styles.halfLine, { top: i * hourHeight + hourHeight / 2 }]}
              />
            ))}

          {/* colonnes */}
          {days.map((key, col) => {
            const d = fromKey(key);
            return (
              <View
                key={`col-${key}`}
                style={[
                  styles.col,
                  { left: GUTTER + col * colW, width: colW },
                  settings.dimWeekend && isWeekend(d) ? styles.dim : null,
                ]}
              >
                {col > 0 && <View style={styles.colSep} />}
              </View>
            );
          })}

          {/* le créneau en train d'être tracé */}
          {ghost && (
            <View
              pointerEvents="none"
              style={[
                styles.ghost,
                {
                  left: GUTTER + ghost.col * colW + 3,
                  width: Math.max(0, colW - 6),
                  top: ((ghost.from - startHour * 60) / 60) * hourHeight,
                  height: Math.max(
                    14,
                    ((ghost.to - ghost.from) / 60) * hourHeight,
                  ),
                  borderColor: ui.accent,
                },
              ]}
            >
              <Text style={[styles.ghostText, { color: ui.accent }]}>
                {hhmm(ghost.from)} – {hhmm(ghost.to)}
              </Text>
            </View>
          )}

          {/* les événements */}
          {days.map((key, col) => {
            const { positioned } = layoutDay(eventsOn(key));
            return positioned.map(({ event, col: sub, cols }) => {
              const c = swatch(event.color);
              const top = ((event.start - startHour * 60) / 60) * hourHeight;
              const h = Math.max(18, ((event.end - event.start) / 60) * hourHeight - 2);
              const w = (colW - 8) / cols;
              const selected = event.id === selectedId;
              return (
                <Press
                  key={event.id}
                  onPress={() => onSelectEvent(event)}
                  title={`${event.title} · ${hhmm(event.start)}–${hhmm(event.end)}`}
                  style={[
                    styles.event,
                    {
                      top,
                      height: h,
                      left: GUTTER + col * colW + 4 + sub * w,
                      width: w - 2,
                      backgroundColor: c.wash,
                      opacity: event.done ? 0.55 : 1,
                    },
                    selected && { borderColor: c.solid, ...dt.shadow.panel },
                  ]}
                  hoverStyle={{ transform: [{ translateY: -1 }], ...dt.shadow.panel }}
                >
                  <View style={[styles.eventBar, { backgroundColor: c.solid }]} />
                  <View style={styles.eventBody}>
                    <Text numberOfLines={h < 34 ? 1 : 2} style={[styles.eventTitle, { color: c.deep }]}>
                      {settings.showEmoji ? `${event.emoji} ` : ''}
                      {event.title}
                    </Text>
                    {h >= 46 && (
                      <Text style={[styles.eventTime, { color: c.deep }]}>
                        {hhmm(event.start)} – {hhmm(event.end)}
                      </Text>
                    )}
                  </View>
                </Press>
              );
            });
          })}

          {/* l'heure qu'il est */}
          {showNow &&
            days.includes(today) &&
            now >= startHour * 60 &&
            now <= endHour * 60 && (
              <View
                pointerEvents="none"
                style={[styles.nowRow, { top: ((now - startHour * 60) / 60) * hourHeight }]}
              >
                <Text style={[styles.nowLabel, { color: ui.today }]}>{hhmm(now)}</Text>
                <View style={[styles.nowLine, { backgroundColor: ui.today }]} />
              </View>
            )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  head: {
    height: HEAD,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  headCell: { height: HEAD, alignItems: 'center', justifyContent: 'center', gap: 1 },
  headSep: { borderLeftWidth: 1, borderLeftColor: dt.line },
  headDay: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headNum: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headNumText: { fontSize: 14, fontWeight: '700', color: dt.ink, letterSpacing: -0.3 },
  headNumToday: { color: '#FFFFFF' },
  dim: { backgroundColor: 'rgba(32,32,43,0.018)' },

  allDay: {
    flexDirection: 'row',
    minHeight: ALLDAY_ROW,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
  },
  allDayLabel: {
    width: GUTTER,
    paddingRight: 8,
    textAlign: 'right',
    fontSize: 9.5,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  allDayCell: { paddingHorizontal: 3, gap: 2 },
  allDayChip: { borderRadius: dt.radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  allDayText: { fontSize: 11, fontWeight: '700' },

  scroll: { flex: 1 },
  body: { position: 'relative' },
  hourRow: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row' },
  hourLabel: {
    width: GUTTER,
    marginTop: -6,
    paddingRight: 10,
    textAlign: 'right',
    fontSize: 10.5,
    fontWeight: '600',
    color: dt.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  hourLine: { flex: 1, height: 1, backgroundColor: dt.line },
  halfLine: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(32,32,43,0.028)',
  },
  col: { position: 'absolute', top: 0, bottom: 0 },
  colSep: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: dt.line },

  ghost: {
    position: 'absolute',
    borderRadius: dt.radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(119,67,239,0.07)',
    paddingHorizontal: 6,
    paddingTop: 2,
    justifyContent: 'flex-start',
  },
  ghostText: { fontSize: 10.5, fontWeight: '800', fontVariant: ['tabular-nums'] },

  event: {
    position: 'absolute',
    borderRadius: dt.radius.sm,
    overflow: 'hidden',
    paddingLeft: 9,
    paddingRight: 5,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  eventBody: { flex: 1, justifyContent: 'flex-start' },
  eventTitle: { fontSize: 11.5, fontWeight: '700', letterSpacing: -0.2 },
  eventTime: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },

  nowRow: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row', zIndex: 5 },
  nowLabel: {
    width: GUTTER,
    marginTop: -6,
    paddingRight: 10,
    textAlign: 'right',
    fontSize: 10.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nowLine: { flex: 1, height: 1.5, opacity: 0.85 },
});
