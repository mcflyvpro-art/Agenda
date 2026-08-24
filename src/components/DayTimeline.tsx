import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { fromKey, hhmm, minutesNow, roundToQuarter, shortDay, todayKey } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { layoutDay } from '../lib/layout';
import { isPagerGestureActive } from './Pager';
import { HOUR_HEIGHT, useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

const GUTTER = 54;

type Props = {
  /** un jour (vue Jour) ou plusieurs (vue 3 jours) */
  days: string[];
  eventsOn: (key: string) => AgendaEvent[];
  onCreateAt: (dateKey: string, minutes: number) => void;
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  bottomInset?: number;
};

/** Bornes horaires affichées, élargies si un événement déborde. */
function visibleRange(events: AgendaEvent[], mode: 'full' | 'active' | 'auto'): [number, number] {
  const timed = events.filter((e) => !e.allDay);
  if (mode === 'full') return [0, 24];
  const base: [number, number] = mode === 'active' ? [7, 23] : [8, 20];
  if (timed.length === 0) return base;
  const earliest = Math.floor(Math.min(...timed.map((e) => e.start)) / 60);
  const latest = Math.ceil(Math.max(...timed.map((e) => e.end)) / 60);
  if (mode === 'active') return [Math.min(base[0], earliest), Math.max(base[1], latest)];
  return [Math.max(0, Math.min(earliest - 1, base[0])), Math.min(24, Math.max(latest + 1, base[1]))];
}

export function DayTimeline({
  days,
  eventsOn,
  onCreateAt,
  onOpen,
  onToggle,
  bottomInset = 0,
}: Props) {
  const { settings, swatch, ui } = useSettings();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const touched = useRef(false);
  const [, setTick] = useState(0);

  const HOUR_H = HOUR_HEIGHT[settings.density];
  const multi = days.length > 1;
  const allEvents = useMemo(() => days.flatMap(eventsOn), [days, eventsOn]);
  const [startHour, endHour] = visibleRange(allEvents, settings.dayRange);
  const hours = useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i),
    [startHour, endHour],
  );
  const todayIndex = days.indexOf(todayKey());
  const isToday = todayIndex >= 0;
  const nowMin = minutesNow();
  const showNow = settings.showNowLine && isToday;
  const nowTop = ((nowMin - startHour * 60) / 60) * HOUR_H;

  const trackWidth = width - GUTTER - 14;
  const colWidth = trackWidth / days.length;
  const contentH = (endHour - startHour) * HOUR_H + 16;

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [isToday]);

  const scrollAnchor = useMemo(() => {
    const firstTimed = allEvents.filter((e) => !e.allDay).sort((a, b) => a.start - b.start)[0];
    const anchor = isToday ? nowMin : firstTimed ? firstTimed.start : 9 * 60;
    return Math.max(0, ((anchor - startHour * 60 - 70) / 60) * HOUR_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0], startHour, HOUR_H]);

  useEffect(() => {
    touched.current = false;
    const t = setTimeout(() => {
      if (!touched.current) scroller.current?.scrollTo({ y: scrollAnchor, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [scrollAnchor]);

  const jumpToAnchor = () => {
    if (touched.current) return;
    scroller.current?.scrollTo({ y: scrollAnchor, animated: false });
  };

  /** Tap sur un créneau vide → création à l'heure (et au jour) touchés. */
  const handleTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    // rempart applicatif en plus de l'arène de gestes : un balayage de page
    // en cours (ou tout juste fini) ne doit jamais ouvrir une création.
    if (isPagerGestureActive()) return;
    const x = e.nativeEvent.locationX;
    const col = Number.isFinite(x) ? Math.min(days.length - 1, Math.max(0, Math.floor(x / colWidth))) : 0;
    const raw = startHour * 60 + (e.nativeEvent.locationY / HOUR_H) * 60;
    const minutes = Math.max(0, Math.min(1425, roundToQuarter(raw)));
    tapLight();
    onCreateAt(days[col], Number.isFinite(minutes) ? minutes : 9 * 60);
  };

  const allDayFor = (key: string) => eventsOn(key).filter((e) => e.allDay);

  return (
    <View style={styles.root}>
      {multi && (
        <View style={[styles.colHeader, { paddingLeft: GUTTER }]}>
          {days.map((key) => {
            const d = fromKey(key);
            const today = key === todayKey();
            return (
              <View key={key} style={{ width: colWidth, alignItems: 'center' }}>
                <Text style={[styles.colDay, today && { color: ui.today }]}>{shortDay(d)}</Text>
                <Text style={[styles.colNum, today && { color: ui.today }]}>{d.getDate()}</Text>
              </View>
            );
          })}
        </View>
      )}

      {multi && days.some((k) => allDayFor(k).length > 0) && (
        <View style={[styles.allDayStrip, { paddingLeft: GUTTER }]}>
          {days.map((key) => (
            <View key={key} style={{ width: colWidth, paddingRight: 3, gap: 2 }}>
              {allDayFor(key).slice(0, 2).map((e) => {
                const c = swatch(e.color);
                return (
                  <Squish
                    key={e.id}
                    onPress={() => {
                      tapSoft();
                      onOpen(e);
                    }}
                    style={[styles.allDayMini, { backgroundColor: c.wash }]}
                  >
                    <Text numberOfLines={1} style={[styles.allDayMiniText, { color: c.deep }]}>
                      {e.title}
                    </Text>
                  </Squish>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {!multi && allDayFor(days[0]).length > 0 && (
        <View style={styles.allDayWrap}>
          {allDayFor(days[0]).map((e, i) => {
            const c = swatch(e.color);
            return (
              <Animated.View key={e.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                <Squish
                  onPress={() => {
                    tapSoft();
                    onOpen(e);
                  }}
                  style={[styles.allDayChip, { backgroundColor: c.wash }]}
                >
                  {settings.showEmoji && <Text style={styles.allDayEmoji}>{e.emoji}</Text>}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.allDayText,
                      { color: c.deep },
                      e.done && { textDecorationLine: 'line-through', opacity: 0.6 },
                    ]}
                  >
                    {e.title}
                  </Text>
                  <Ionicons name="sunny" size={14} color={c.deep} />
                </Squish>
              </Animated.View>
            );
          })}
        </View>
      )}

      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 130, paddingTop: 14 }}
        onContentSizeChange={jumpToAnchor}
        onLayout={jumpToAnchor}
        onScrollBeginDrag={() => {
          touched.current = true;
        }}
      >
        <View style={{ height: contentH }}>
          {hours.map((h) => {
            const top = (h - startHour) * HOUR_H - 10;
            const masked = showNow && Math.abs(h * 60 - nowMin) < 22;
            return (
              <View key={h} style={[styles.hourRow, { top }]}>
                <Text style={[styles.hourLabel, masked && { opacity: 0 }]}>
                  {`${`${h}`.padStart(2, '0')}:00`}
                </Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          {multi &&
            days.map((key, i) =>
              i === 0 ? null : (
                <View
                  key={`sep-${key}`}
                  style={[styles.colSep, { left: GUTTER + i * colWidth, height: contentH }]}
                />
              ),
            )}

          <Pressable style={[styles.tapLayer, { left: GUTTER }]} onPress={handleTap} />

          {days.map((key, col) => {
            const positioned = layoutDay(eventsOn(key));
            return positioned.map(({ event, col: sub, cols }, i) => {
              const c = swatch(event.color);
              const top = ((event.start - startHour * 60) / 60) * HOUR_H;
              const rawH = ((Math.max(event.end, event.start + 20) - event.start) / 60) * HOUR_H;
              const height = Math.max(34, rawH - 4);
              const w = colWidth / cols;
              const left = GUTTER + col * colWidth + sub * w;
              const tiny = height < 46 || multi;
              const roomy = height >= 74 && !multi;
              return (
                <Animated.View
                  key={event.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}
                  style={[styles.eventWrap, { top, left, width: w - (multi ? 3 : 6), height }]}
                >
                  <Squish
                    onPress={() => {
                      tapSoft();
                      onOpen(event);
                    }}
                    onLongPress={() => {
                      tapLight();
                      onToggle(event.id);
                    }}
                    delayLongPress={280}
                    style={[
                      styles.event,
                      {
                        backgroundColor: c.wash,
                        opacity: event.done ? 0.55 : 1,
                        paddingVertical: tiny ? 4 : 8,
                        paddingLeft: multi ? 8 : 12,
                      },
                    ]}
                  >
                    <View style={[styles.eventBar, { backgroundColor: c.solid }]} />
                    <View style={styles.eventBody}>
                      <View style={styles.eventTitleRow}>
                        {settings.showEmoji && !multi && (
                          <Text style={styles.eventEmoji}>{event.emoji}</Text>
                        )}
                        <Text
                          numberOfLines={tiny ? 1 : 2}
                          style={[
                            styles.eventTitle,
                            multi && { fontSize: 11.5 },
                            { color: c.deep },
                            event.done && { textDecorationLine: 'line-through' },
                          ]}
                        >
                          {event.title}
                        </Text>
                        {event.done && !multi && (
                          <Ionicons name="checkmark-circle" size={14} color={c.deep} />
                        )}
                      </View>
                      {!tiny && settings.detail !== 'minimal' && (
                        <Text style={[styles.eventTime, { color: c.deep }]}>
                          {hhmm(event.start)} – {hhmm(event.end)}
                        </Text>
                      )}
                      {roomy && settings.detail === 'full' && !!event.location && (
                        <Text numberOfLines={1} style={[styles.eventTime, { color: c.deep }]}>
                          {event.location}
                        </Text>
                      )}
                    </View>
                  </Squish>
                </Animated.View>
              );
            });
          })}

          {showNow && (
            <Animated.View
              entering={FadeIn.duration(500)}
              style={[StyleSheet.absoluteFill, styles.nowLayer]}
            >
              <View style={[styles.nowBadge, { top: nowTop - 8 }]}>
                <Text style={[styles.nowBadgeText, { color: ui.today }]}>{hhmm(nowMin)}</Text>
              </View>
              <View
                style={[
                  styles.nowStroke,
                  {
                    top: nowTop,
                    left: GUTTER + Math.max(0, todayIndex) * colWidth,
                    width: colWidth - (multi ? 3 : 0),
                    backgroundColor: ui.today,
                  },
                ]}
              />
              <View
                style={[
                  styles.nowDot,
                  {
                    top: nowTop - 3.5,
                    left: GUTTER + Math.max(0, todayIndex) * colWidth - 4,
                    backgroundColor: ui.today,
                  },
                ]}
              />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  colHeader: { flexDirection: 'row', paddingBottom: 6, paddingRight: 14 },
  colDay: { fontSize: 10.5, fontWeight: '700', color: theme.inkFaint, letterSpacing: 0.3 },
  colNum: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  colSep: { position: 'absolute', top: 0, width: 1, backgroundColor: theme.hairline },
  allDayWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  allDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  allDayEmoji: { fontSize: 15 },
  allDayText: { flex: 1, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: GUTTER,
    paddingRight: 10,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: theme.inkFaint,
    letterSpacing: -0.1,
  },
  hourLine: { flex: 1, height: 1, backgroundColor: theme.hairline, marginRight: 14 },
  tapLayer: { position: 'absolute', top: 0, right: 14, bottom: 0 },
  eventWrap: { position: 'absolute' },
  event: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: theme.radius.md,
    paddingRight: 8,
    overflow: 'hidden',
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  eventBody: { flex: 1, justifyContent: 'center' },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventEmoji: { fontSize: 13 },
  eventTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  eventTime: { fontSize: 11.5, fontWeight: '600', marginTop: 2, opacity: 0.85 },
  // purement décoratif : sans ça, ce calque plein écran avale tous les taps
  // de la timeline (événements, créneaux vides) dès qu'on regarde aujourd'hui.
  nowLayer: { pointerEvents: 'none' },
  nowBadge: { position: 'absolute', left: 0, width: GUTTER, alignItems: 'flex-end', paddingRight: 7 },
  nowBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: -0.2 },
  nowDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  nowStroke: { position: 'absolute', height: 1.6, opacity: 0.7, borderRadius: 1 },
  allDayStrip: { flexDirection: 'row', paddingBottom: 6 },
  allDayMini: { borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 },
  allDayMiniText: { fontSize: 9.5, fontWeight: '700', letterSpacing: -0.1 },
});
