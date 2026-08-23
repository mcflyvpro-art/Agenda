import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { hhmm, minutesNow, roundToQuarter, todayKey } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { layoutDay } from '../lib/layout';
import { swatch, theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

export const HOUR_H = 70;
const GUTTER = 58;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Props = {
  dateKey: string;
  events: AgendaEvent[];
  onCreateAt: (minutes: number) => void;
  onOpen: (e: AgendaEvent) => void;
  onToggle: (id: string) => void;
  bottomInset?: number;
};

export function DayTimeline({
  dateKey,
  events,
  onCreateAt,
  onOpen,
  onToggle,
  bottomInset = 0,
}: Props) {
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const tapLayer = useRef<View>(null);
  const isToday = dateKey === todayKey();
  const allDay = useMemo(() => events.filter((e) => e.allDay), [events]);
  const positioned = useMemo(() => layoutDay(events), [events]);
  const trackWidth = width - GUTTER - 18;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [isToday]);

  const scrollAnchor = useMemo(() => {
    const firstTimed = events.find((e) => !e.allDay);
    const anchor = isToday ? minutesNow() : firstTimed ? firstTimed.start : 8 * 60;
    return Math.max(0, ((anchor - 75) / 60) * HOUR_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  /** true dès que l'utilisatrice a fait défiler elle-même : on ne recale plus. */
  const touched = useRef(false);

  useEffect(() => {
    touched.current = false;
    const t = setTimeout(() => {
      if (!touched.current) scroller.current?.scrollTo({ y: scrollAnchor, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [dateKey, scrollAnchor]);

  /** Tap sur un créneau vide → création à l'heure touchée. */
  const handleTapOnEmptySlot = (e: GestureResponderEvent) => {
    const commit = (y: number) => {
      const minutes = Math.max(0, Math.min(1425, roundToQuarter((y / HOUR_H) * 60)));
      tapLight();
      onCreateAt(Number.isFinite(minutes) ? minutes : 9 * 60);
    };
    const local = e.nativeEvent.locationY;
    if (Number.isFinite(local)) return commit(local);
    // certains environnements (web) ne fournissent pas locationY : on mesure
    const pageY = e.nativeEvent.pageY;
    const node = tapLayer.current;
    if (node && Number.isFinite(pageY)) {
      node.measureInWindow((_x, windowY) => commit(pageY - windowY));
      return;
    }
    commit(9 * 60);
  };

  const jumpToAnchor = () => {
    if (touched.current) return;
    scroller.current?.scrollTo({ y: scrollAnchor, animated: false });
  };

  const nowMin = minutesNow();
  const nowTop = (nowMin / 60) * HOUR_H - 1;

  return (
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
      {allDay.length > 0 && (
        <View style={styles.allDayWrap}>
          {allDay.map((e, i) => {
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
                  <Text style={styles.allDayEmoji}>{e.emoji}</Text>
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
                  <Text style={[styles.allDayTag, { color: c.deep }]}>journée</Text>
                </Squish>
              </Animated.View>
            );
          })}
        </View>
      )}

      <View style={{ height: HOUR_H * 24 + 20 }}>
        {/* lignes horaires + zone de création */}
        {HOURS.map((h) => {
          const masked = isToday && Math.abs(h * 60 - nowMin) < 22;
          return (
            <View key={h} style={[styles.hourRow, { top: h * HOUR_H - 10 }]}>
              <Text style={[styles.hourLabel, masked && { opacity: 0 }]}>
                {`${`${h}`.padStart(2, '0')}:00`}
              </Text>
              <View style={styles.hourLine} />
            </View>
          );
        })}

        <Pressable
          ref={tapLayer}
          style={[styles.tapLayer, { left: GUTTER }]}
          onPress={handleTapOnEmptySlot}
        />

        {positioned.map(({ event, col, cols }, i) => {
          const c = swatch(event.color);
          const top = (event.start / 60) * HOUR_H;
          const rawH = ((Math.max(event.end, event.start + 20) - event.start) / 60) * HOUR_H;
          const height = Math.max(38, rawH - 4);
          const colW = trackWidth / cols;
          const left = GUTTER + col * colW;
          const compact = height < 56;
          return (
            <Animated.View
              key={event.id}
              entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}
              style={[styles.eventWrap, { top, left, width: colW - 6, height }]}
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
                    borderColor: c.solid,
                    opacity: event.done ? 0.55 : 1,
                    paddingVertical: compact ? 6 : 9,
                  },
                ]}
              >
                <View style={[styles.eventBar, { backgroundColor: c.solid }]} />
                <View style={styles.eventBody}>
                  <View style={styles.eventTitleRow}>
                    <Text style={styles.eventEmoji}>{event.emoji}</Text>
                    <Text
                      numberOfLines={compact ? 1 : 2}
                      style={[
                        styles.eventTitle,
                        { color: c.deep },
                        event.done && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {event.title}
                    </Text>
                    {event.done && <Ionicons name="checkmark-circle" size={14} color={c.deep} />}
                  </View>
                  {!compact && (
                    <Text style={[styles.eventTime, { color: c.deep }]}>
                      {hhmm(event.start)} – {hhmm(event.end)}
                      {event.location ? ` · ${event.location}` : ''}
                    </Text>
                  )}
                </View>
              </Squish>
            </Animated.View>
          );
        })}

        {isToday && (
          <Animated.View entering={FadeIn.duration(500)} style={[styles.nowLine, { top: nowTop }]}>
            <View style={styles.nowBadge}>
              <Text style={styles.nowBadgeText}>{hhmm(nowMin)}</Text>
            </View>
            <View style={styles.nowDot} />
            <View style={styles.nowStroke} />
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  allDayWrap: { paddingHorizontal: 18, paddingBottom: 10, gap: 8 },
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
  allDayTag: { fontSize: 11, fontWeight: '700', opacity: 0.6, letterSpacing: 0.2 },
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
    paddingRight: 12,
    textAlign: 'right',
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.inkFaint,
    letterSpacing: -0.1,
  },
  hourLine: { flex: 1, height: 1, backgroundColor: theme.hairline, marginRight: 18 },
  tapLayer: { position: 'absolute', top: 0, right: 18, bottom: 0 },
  eventWrap: { position: 'absolute' },
  event: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: theme.radius.md,
    paddingLeft: 12,
    paddingRight: 10,
    overflow: 'hidden',
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  eventBody: { flex: 1, justifyContent: 'center' },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventEmoji: { fontSize: 13 },
  eventTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  eventTime: { fontSize: 11.5, fontWeight: '600', marginTop: 2, opacity: 0.85 },
  nowLine: {
    position: 'absolute',
    zIndex: 5,
    left: 0,
    right: 18,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowBadge: {
    width: GUTTER,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  nowBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.today,
    letterSpacing: -0.2,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.today,
  },
  nowStroke: { flex: 1, height: 1.6, backgroundColor: theme.today, opacity: 0.65 },
});
