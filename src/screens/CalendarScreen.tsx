import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AddButton } from '../components/AddButton';
import { AgendaPanel } from '../components/AgendaPanel';
import { DayRail } from '../components/DayRail';
import { DayTimeline } from '../components/DayTimeline';
import { EmptyDay } from '../components/EmptyDay';
import { EventCard } from '../components/EventCard';
import { EventSheet } from '../components/EventSheet';
import { ModeSwitch } from '../components/ModeSwitch';
import { MonthGrid } from '../components/MonthGrid';
import { Pager } from '../components/Pager';
import { SettingsSheet } from '../components/SettingsSheet';
import { Squish } from '../components/Squish';
import { WeekStrip } from '../components/WeekStrip';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  fromKey,
  longDay,
  minutesNow,
  monthYearTitle,
  relativeDayLabel,
  startOfMonth,
  startOfToday,
  toKey,
  todayKey,
} from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { CELL_HEIGHT, DENSITY_SCALE, useSettings } from '../store/settings';
import { useEvents } from '../store/events';
import { COLOR_KEYS, theme } from '../theme';
import type { AgendaEvent, Draft, ViewMode } from '../types';

const MONTH_SPAN = 240;
const MONTH_COUNT = MONTH_SPAN * 2 + 1;
const DAY_SPAN = 730;
const DAY_COUNT = DAY_SPAN * 2 + 1;

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { byDay, save, remove, toggleDone, events } = useEvents();
  const { settings } = useSettings();

  const anchorMonth = useMemo(() => startOfMonth(new Date()), []);
  const anchorDay = useMemo(() => startOfToday(), []);

  const [mode, setMode] = useState<ViewMode>('month');
  const [selectedKey, setSelectedKey] = useState(todayKey());
  const [monthIndex, setMonthIndex] = useState(MONTH_SPAN);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheet, setSheet] = useState<{ visible: boolean; draft: Draft | null }>({
    visible: false,
    draft: null,
  });

  const monthForIndex = useCallback(
    (i: number) => addMonths(anchorMonth, i - MONTH_SPAN),
    [anchorMonth],
  );
  const dayForIndex = useCallback((i: number) => addDays(anchorDay, i - DAY_SPAN), [anchorDay]);
  const dayIndex = useMemo(
    () => DAY_SPAN + differenceInCalendarDays(fromKey(selectedKey), anchorDay),
    [selectedKey, anchorDay],
  );

  // « masquer ce qui est fait » se règle ici, une fois pour toutes les vues
  const visibleByDay = useMemo(() => {
    if (!settings.hideDone) return byDay;
    const out: Record<string, AgendaEvent[]> = {};
    for (const key of Object.keys(byDay)) {
      const kept = byDay[key].filter((e) => !e.done);
      if (kept.length) out[key] = kept;
    }
    return out;
  }, [byDay, settings.hideDone]);

  const visibleOn = useCallback(
    (key: string) => visibleByDay[key] ?? [],
    [visibleByDay],
  );

  const visibleMonth = monthForIndex(monthIndex);
  const dayEvents = visibleOn(selectedKey);
  const monthCount = useMemo(() => {
    const m = visibleMonth.getMonth();
    const y = visibleMonth.getFullYear();
    return events.filter((e) => {
      const d = fromKey(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [events, visibleMonth]);

  // hauteur d'une case : la disposition donne la base, la densité l'étire,
  // et le panneau du bas décide de ce qui reste.
  const cellHeight = useMemo(() => {
    const base = CELL_HEIGHT[settings.monthLayout] * DENSITY_SCALE[settings.density];
    if (bodyHeight <= 0) return base;
    if (settings.monthPanel === 'none') {
      return Math.max(46, (bodyHeight - 34) / 6);
    }
    const roomForGrid = bodyHeight - 190;
    return Math.max(42, Math.min(base, roomForGrid / 6));
  }, [settings.monthLayout, settings.density, settings.monthPanel, bodyHeight]);

  const selectDay = useCallback(
    (key: string) => {
      setSelectedKey(key);
      const diff = differenceInCalendarMonths(startOfMonth(fromKey(key)), anchorMonth);
      setMonthIndex(MONTH_SPAN + diff);
    },
    [anchorMonth],
  );

  const goToday = useCallback(() => {
    tapSoft();
    selectDay(todayKey());
  }, [selectDay]);

  const makeDraft = useCallback(
    (dateKey: string, start?: number): Draft => {
      const isToday = dateKey === todayKey();
      const base =
        start ?? (isToday ? Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30) : 9 * 60);
      return {
        title: '',
        emoji: '✨',
        color: COLOR_KEYS[events.length % COLOR_KEYS.length],
        date: dateKey,
        start: base,
        end: Math.min(1440, base + 60),
        allDay: false,
        location: '',
        notes: '',
        done: false,
      };
    },
    [events.length],
  );

  const openNew = useCallback(
    (dateKey: string, start?: number) =>
      setSheet({ visible: true, draft: makeDraft(dateKey, start) }),
    [makeDraft],
  );

  const openEvent = useCallback((e: AgendaEvent) => setSheet({ visible: true, draft: e }), []);

  const handleSave = useCallback(
    (draft: Draft) => {
      save(draft);
      if (draft.date !== selectedKey) selectDay(draft.date);
    },
    [save, selectDay, selectedKey],
  );

  const createAt = useCallback(
    (dateKey: string, minutes: number) => {
      if (dateKey !== selectedKey) selectDay(dateKey);
      openNew(dateKey, minutes);
    },
    [openNew, selectDay, selectedKey],
  );

  const dayLabel = relativeDayLabel(selectedKey);
  const isRelative = ["Aujourd'hui", 'Demain', 'Hier'].includes(dayLabel);
  const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const headerTitle = mode === 'month' ? monthYearTitle(visibleMonth) : dayLabel;
  const headerSub =
    mode === 'month'
      ? `${plural(monthCount, 'événement')} ce mois-ci`
      : isRelative
        ? longDay(fromKey(selectedKey))
        : plural(dayEvents.length, 'événement');

  const isOnToday = selectedKey === todayKey() && monthIndex === MONTH_SPAN;

  const renderDayPage = (i: number) => {
    const key = toKey(dayForIndex(i));
    const common = {
      onOpen: openEvent,
      onToggle: toggleDone,
      bottomInset: insets.bottom,
    };
    if (settings.dayLayout === 'rail') {
      return (
        <DayRail
          dateKey={key}
          events={visibleOn(key)}
          onCreateAt={(m) => createAt(key, m)}
          {...common}
        />
      );
    }
    if (settings.dayLayout === 'list') {
      const list = visibleOn(key);
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 6,
            paddingBottom: insets.bottom + 130,
          }}
        >
          {list.length === 0 ? (
            <EmptyDay />
          ) : (
            list.map((e, k) => (
              <EventCard key={e.id} event={e} index={k} onPress={openEvent} onToggle={toggleDone} />
            ))
          )}
        </ScrollView>
      );
    }
    const days =
      settings.dayLayout === 'three'
        ? [key, toKey(addDays(fromKey(key), 1)), toKey(addDays(fromKey(key), 2))]
        : [key];
    return (
      <DayTimeline days={days} eventsOn={visibleOn} onCreateAt={createAt} {...common} />
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Animated.View key={headerTitle} entering={FadeIn.duration(260)} style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {headerSub}
            </Text>
          </Animated.View>

          {!isOnToday && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Squish style={styles.todayBtn} onPress={goToday} scaleTo={0.9}>
                <Ionicons name="locate-outline" size={14} color={theme.accent} />
                <Text style={styles.todayText}>Aujourd&apos;hui</Text>
              </Squish>
            </Animated.View>
          )}

          <Squish
            style={styles.iconBtn}
            scaleTo={0.88}
            onPress={() => {
              tapSoft();
              setSettingsOpen(true);
            }}
          >
            <Ionicons name="options-outline" size={19} color={theme.inkSoft} />
          </Squish>
        </View>

        <View style={styles.headerBottom}>
          <ModeSwitch mode={mode} onChange={setMode} />
          {mode === 'month' && (
            <View style={styles.arrows}>
              <Squish
                style={styles.arrowBtn}
                onPress={() => {
                  tapSoft();
                  setMonthIndex((i) => Math.max(0, i - 1));
                }}
              >
                <Ionicons name="chevron-back" size={17} color={theme.inkSoft} />
              </Squish>
              <Squish
                style={styles.arrowBtn}
                onPress={() => {
                  tapSoft();
                  setMonthIndex((i) => Math.min(MONTH_COUNT - 1, i + 1));
                }}
              >
                <Ionicons name="chevron-forward" size={17} color={theme.inkSoft} />
              </Squish>
            </View>
          )}
        </View>
      </View>

      {mode === 'month' ? (
        <View style={styles.flex} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
          <Animated.View
            key={`month-${settings.monthLayout}-${settings.monthPanel}-${settings.density}`}
            entering={FadeIn.duration(260)}
            style={styles.flex}
          >
            <View style={{ height: cellHeight * 6 + 26 }}>
              <Pager
                count={MONTH_COUNT}
                index={monthIndex}
                width={width}
                onIndexChange={setMonthIndex}
                renderPage={(i) => (
                  <View style={styles.monthPage}>
                    <MonthGrid
                      month={monthForIndex(i)}
                      selectedKey={selectedKey}
                      byDay={visibleByDay}
                      onSelect={selectDay}
                      cellHeight={cellHeight}
                    />
                  </View>
                )}
              />
            </View>

            {settings.monthPanel === 'day' && (
              <>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>{dayLabel}</Text>
                  <View style={styles.listRule} />
                  <Text style={styles.listCount}>{dayEvents.length}</Text>
                </View>
                <ScrollView
                  style={styles.flex}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 18,
                    paddingBottom: insets.bottom + 120,
                  }}
                >
                  <Animated.View
                    key={selectedKey}
                    entering={FadeInDown.duration(280)}
                    layout={LinearTransition}
                  >
                    {dayEvents.length === 0 ? (
                      <EmptyDay />
                    ) : (
                      dayEvents.map((e, i) => (
                        <EventCard
                          key={e.id}
                          event={e}
                          index={i}
                          onPress={openEvent}
                          onToggle={toggleDone}
                        />
                      ))
                    )}
                  </Animated.View>
                </ScrollView>
              </>
            )}

            {settings.monthPanel === 'agenda' && (
              <AgendaPanel
                fromDate={selectedKey}
                byDay={visibleByDay}
                onOpen={openEvent}
                onToggle={toggleDone}
                bottomInset={insets.bottom}
              />
            )}
          </Animated.View>
        </View>
      ) : (
        <Animated.View key="day" entering={FadeIn.duration(240)} style={styles.flex}>
          <WeekStrip selectedKey={selectedKey} byDay={visibleByDay} onSelect={selectDay} />
          <View style={styles.flex} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
            {bodyHeight > 0 && (
              <Pager
                key={settings.dayLayout}
                count={DAY_COUNT}
                index={dayIndex}
                width={width}
                pageHeight={bodyHeight}
                style={styles.flex}
                onIndexChange={(i) => selectDay(toKey(dayForIndex(i)))}
                renderPage={renderDayPage}
              />
            )}
          </View>
        </Animated.View>
      )}

      <AddButton onPress={() => openNew(selectedKey)} bottom={insets.bottom + 22} />

      <EventSheet
        visible={sheet.visible}
        draft={sheet.draft}
        byDay={byDay}
        onClose={() => setSheet((s) => ({ ...s, visible: false }))}
        onSave={handleSave}
        onDelete={remove}
      />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 30, fontWeight: '800', color: theme.ink, letterSpacing: -0.9 },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(142,124,232,0.12)',
  },
  todayText: { fontSize: 13, fontWeight: '700', color: theme.accent, letterSpacing: -0.2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...theme.shadow.soft,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    ...theme.shadow.soft,
  },
  monthPage: { paddingHorizontal: 10, paddingTop: 8 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  listTitle: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  listRule: { flex: 1, height: 1, backgroundColor: theme.hairline },
  listCount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.inkFaint,
    minWidth: 16,
    textAlign: 'right',
  },
});
