import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCROLL_IN_PAGER } from '../lib/gestures';
import { DayRail } from '../components/DayRail';
import { DaySheet } from '../components/DaySheet';
import { DayTimeline } from '../components/DayTimeline';
import { EmptyDay } from '../components/EmptyDay';
import { EventCard } from '../components/EventCard';
import { MonthGrid } from '../components/MonthGrid';
import { NavSwipe } from '../components/NavSwipe';
import { OverlapSheet } from '../components/OverlapSheet';
import { Pager } from '../components/Pager';
import { PlannerList } from '../components/PlannerList';
import { SegmentedRow } from '../components/SegmentedRow';
import { Squish } from '../components/Squish';
import { WeekStrip } from '../components/WeekStrip';
import { YearGrid } from '../components/YearGrid';
import {
  addDays,
  addMonths,
  dayMonth,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  fromKey,
  getISOWeek,
  longDay,
  minutesNow,
  monthYearTitle,
  relativeDayLabel,
  startOfMonth,
  startOfToday,
  startOfWeek,
  toKey,
  todayKey,
  weekOf,
} from '../lib/date';
import { tapSoft } from '../lib/haptics';
import { CELL_HEIGHT, DENSITY_SCALE, useSettings } from '../store/settings';
import type { Scale } from '../store/settings';
import { useEvents } from '../store/events';
import { COLOR_KEYS, theme } from '../theme';
import type { AgendaEvent } from '../types';

const MONTH_SPAN = 240;
const MONTH_COUNT = MONTH_SPAN * 2 + 1;
const DAY_SPAN = 730;
const DAY_COUNT = DAY_SPAN * 2 + 1;
const WEEK_SPAN = 260;
const WEEK_COUNT = WEEK_SPAN * 2 + 1;
const YEAR_SPAN = 40;
const YEAR_COUNT = YEAR_SPAN * 2 + 1;

/** course minimale de la feuille du jour : en deçà, la tirer n'apporte rien */
const MIN_SHEET_TRAVEL = 90;

const SCALES: { key: Scale; label: string }[] = [
  { key: 'year', label: 'Année' },
  { key: 'month', label: 'Mois' },
  { key: 'week', label: 'Semaine' },
  { key: 'day', label: 'Jour' },
  { key: 'list', label: 'Liste' },
];

type Props = {
  selectedKey: string;
  onSelectDay: (key: string) => void;
  onOpenEvent: (e: AgendaEvent) => void;
  onRemoveEvent: (id: string) => void;
  onCreateAt: (dateKey: string, minutes?: number) => void;
  onOpenSettings: () => void;
  bottomInset: number;
};

export function CalendarScreen({
  selectedKey,
  onSelectDay,
  onOpenEvent,
  onRemoveEvent,
  onCreateAt,
  onOpenSettings,
  bottomInset,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { byDay, toggleDone, events } = useEvents();
  const { settings, update, ui } = useSettings();
  const scale = settings.scale;

  const anchorMonth = useMemo(() => startOfMonth(new Date()), []);
  const anchorDay = useMemo(() => startOfToday(), []);
  const anchorWeek = useMemo(
    () => startOfWeek(startOfToday(), { weekStartsOn: settings.weekStart }),
    [settings.weekStart],
  );
  const anchorYear = useMemo(() => new Date().getFullYear(), []);

  const [monthIndex, setMonthIndex] = useState(MONTH_SPAN);
  const [yearIndex, setYearIndex] = useState(YEAR_SPAN);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [dayHeight, setDayHeight] = useState(0);
  /** la grappe d'événements simultanés qu'on est en train de déplier */
  const [overlap, setOverlap] = useState<AgendaEvent[] | null>(null);

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

  const visibleOn = useCallback((key: string) => visibleByDay[key] ?? [], [visibleByDay]);

  const monthForIndex = useCallback(
    (i: number) => addMonths(anchorMonth, i - MONTH_SPAN),
    [anchorMonth],
  );
  const dayForIndex = useCallback((i: number) => addDays(anchorDay, i - DAY_SPAN), [anchorDay]);
  const weekStartForIndex = useCallback(
    (i: number) => addDays(anchorWeek, (i - WEEK_SPAN) * 7),
    [anchorWeek],
  );

  const selectedDate = fromKey(selectedKey);
  const dayIndex = DAY_SPAN + differenceInCalendarDays(selectedDate, anchorDay);
  const weekIndex =
    WEEK_SPAN +
    Math.round(
      differenceInCalendarDays(
        startOfWeek(selectedDate, { weekStartsOn: settings.weekStart }),
        anchorWeek,
      ) / 7,
    );
  const weekdayOffset = differenceInCalendarDays(
    selectedDate,
    startOfWeek(selectedDate, { weekStartsOn: settings.weekStart }),
  );

  const visibleMonth = monthForIndex(monthIndex);
  const visibleYear = anchorYear + (yearIndex - YEAR_SPAN);
  const dayEvents = visibleOn(selectedKey);

  const countIn = useCallback(
    (test: (d: Date) => boolean) => events.filter((e) => test(fromKey(e.date))).length,
    [events],
  );

  const cellHeight = useMemo(() => {
    const base = CELL_HEIGHT[settings.monthCells] * DENSITY_SCALE[settings.density];
    if (bodyHeight <= 0) return base;
    // plein écran : la grille prend tout, moins la place de la barre d'onglets
    // flottante — sinon la dernière semaine se retrouve dessous
    if (settings.monthPanel === 'none') {
      return Math.max(46, (bodyHeight - 34 - bottomInset) / 6);
    }
    return Math.max(42, Math.min(base, (bodyHeight - 190) / 6));
  }, [settings.monthCells, settings.density, settings.monthPanel, bodyHeight, bottomInset]);

  const selectDay = onSelectDay;

  // le jour choisi peut venir d'ailleurs (accueil, création) : les pages suivent
  useEffect(() => {
    const d = fromKey(selectedKey);
    setMonthIndex(MONTH_SPAN + differenceInCalendarMonths(startOfMonth(d), anchorMonth));
    setYearIndex(YEAR_SPAN + (d.getFullYear() - anchorYear));
  }, [selectedKey, anchorMonth, anchorYear]);

  const goToday = useCallback(() => {
    tapSoft();
    selectDay(todayKey());
  }, [selectDay]);

  const setScale = useCallback(
    (next: Scale) => {
      update({ scale: next });
    },
    [update],
  );

  /**
   * Reculer ou avancer d'un cran, dans l'unité de la vue courante.
   * C'est ce que déclenche le balayage du bandeau du haut — le geste qui
   * marche partout, y compris là où le corps de l'écran appartient aux
   * cartes. La vue Liste défile en continu : il n'y a rien à paginer.
   */
  const step = useCallback(
    (delta: number) => {
      const d = delta < 0 ? -1 : 1;
      tapSoft();
      switch (scale) {
        case 'year':
          setYearIndex((i) => Math.max(0, Math.min(YEAR_COUNT - 1, i + d)));
          break;
        case 'month':
          setMonthIndex((i) => Math.max(0, Math.min(MONTH_COUNT - 1, i + d)));
          break;
        case 'week':
          selectDay(toKey(addDays(fromKey(selectedKey), d * (settings.weekLayout === 'grid3' ? 3 : 7))));
          break;
        case 'day':
          selectDay(toKey(addDays(fromKey(selectedKey), d)));
          break;
        default:
          break;
      }
    },
    [scale, settings.weekLayout, selectedKey, selectDay],
  );

  const createAt = onCreateAt;
  const openEvent = onOpenEvent;

  // ---- en-tête -------------------------------------------------------------

  const dayLabel = relativeDayLabel(selectedKey);
  const isRelative = ["Aujourd'hui", 'Demain', 'Hier'].includes(dayLabel);
  const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const weekDays = weekOf(selectedDate, settings.weekStart);

  const { title, subtitle } = useMemo(() => {
    switch (scale) {
      case 'year':
        return { title: `${visibleYear}`, subtitle: '' };
      case 'week': {
        if (settings.weekLayout === 'grid3') {
          const last = addDays(selectedDate, 2);
          return { title: `${dayMonth(selectedDate)} – ${dayMonth(last)}`, subtitle: '' };
        }
        const first = weekDays[0];
        const last = weekDays[6];
        return {
          title: `Semaine ${getISOWeek(first)}`,
          subtitle: `${dayMonth(first)} – ${dayMonth(last)}`,
        };
      }
      case 'day':
        return { title: dayLabel, subtitle: isRelative ? longDay(selectedDate) : '' };
      case 'list':
        return { title: monthYearTitle(new Date()), subtitle: '' };
      default:
        return { title: monthYearTitle(visibleMonth), subtitle: '' };
    }
  }, [
    scale,
    visibleYear,
    visibleMonth,
    weekDays,
    dayLabel,
    isRelative,
    selectedDate,
    dayEvents.length,
    countIn,
    settings.weekLayout,
  ]);

  const isOnToday =
    selectedKey === todayKey() && monthIndex === MONTH_SPAN && yearIndex === YEAR_SPAN;

  // ---- corps ---------------------------------------------------------------

  const dayPage = (key: string) => {
    const common = { onOpen: openEvent, onToggle: toggleDone, bottomInset };
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
          style={SCROLL_IN_PAGER}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 6,
            paddingBottom: bottomInset + 30,
          }}
        >
          {list.length === 0 ? (
            <EmptyDay />
          ) : (
            list.map((e, k) => (
              <EventCard
                key={e.id}
                event={e}
                index={k}
                onPress={openEvent}
                onToggle={toggleDone}
                onRemove={onRemoveEvent}
              />
            ))
          )}
        </ScrollView>
      );
    }
    return (
      <DayTimeline
        days={[key]}
        eventsOn={visibleOn}
        onCreateAt={createAt}
        onShowOverlap={setOverlap}
        {...common}
      />
    );
  };

  const body = () => {
    switch (scale) {
      case 'year':
        return (
          <Pager
            count={YEAR_COUNT}
            index={yearIndex}
            width={width}
            pageHeight={bodyHeight}
            onIndexChange={setYearIndex}
            renderPage={(i) => (
              <ScrollView showsVerticalScrollIndicator={false} style={SCROLL_IN_PAGER}>
                <YearGrid
                  year={anchorYear + (i - YEAR_SPAN)}
                  byDay={visibleByDay}
                  bottomInset={bottomInset}
                  available={bodyHeight}
                  onPickMonth={(m) => {
                    setMonthIndex(MONTH_SPAN + differenceInCalendarMonths(m, anchorMonth));
                    setScale('month');
                  }}
                />
              </ScrollView>
            )}
          />
        );

      case 'week': {
        if (settings.weekLayout === 'grid3') {
          return (
            <Pager
              count={DAY_COUNT}
              index={dayIndex}
              width={width}
              pageHeight={bodyHeight}
              onIndexChange={(i) => selectDay(toKey(dayForIndex(i)))}
              renderPage={(i) => {
                const start = dayForIndex(i);
                return (
                  <DayTimeline
                    days={[0, 1, 2].map((k) => toKey(addDays(start, k)))}
                    eventsOn={visibleOn}
                    onCreateAt={createAt}
                    onOpen={openEvent}
                    onToggle={toggleDone}
                    onShowOverlap={setOverlap}
                    bottomInset={bottomInset}
                  />
                );
              }}
            />
          );
        }
        const isList = settings.weekLayout === 'list';
        const pager = (h: number) => (
          <Pager
            count={WEEK_COUNT}
            index={weekIndex}
            width={width}
            pageHeight={h}
            // en Liste, les cartes remplissent l'écran : le glissement leur
            // revient, on navigue par la bande des jours au-dessus
            swipeable={!isList}
            onIndexChange={(i) =>
              selectDay(toKey(addDays(weekStartForIndex(i), weekdayOffset)))
            }
            renderPage={(i) => {
              const first = weekStartForIndex(i);
              const days = Array.from({ length: 7 }, (_, k) => toKey(addDays(first, k)));
              if (isList) {
                return (
                  <PlannerList
                    days={days}
                    byDay={visibleByDay}
                    onOpen={openEvent}
                    onToggle={toggleDone}
                    onRemove={onRemoveEvent}
                    bottomInset={bottomInset}
                    keepEmpty
                  />
                );
              }
              return (
                <DayTimeline
                  days={days}
                  eventsOn={visibleOn}
                  onCreateAt={createAt}
                  onOpen={openEvent}
                  onToggle={toggleDone}
                  onShowOverlap={setOverlap}
                  bottomInset={bottomInset}
                />
              );
            }}
          />
        );

        if (!isList) return pager(bodyHeight);

        // la bande des jours devient le gouvernail de la vue en liste
        return (
          <>
            <NavSwipe onStep={step}>
              <WeekStrip
                selectedKey={selectedKey}
                byDay={visibleByDay}
                onSelect={selectDay}
                onLongSelect={(key: string) => onCreateAt(key)}
              />
            </NavSwipe>
            <View style={styles.flex} onLayout={(e) => setDayHeight(e.nativeEvent.layout.height)}>
              {dayHeight > 0 && pager(dayHeight)}
            </View>
          </>
        );
      }

      case 'day':
        return (
          <>
            <NavSwipe onStep={step}>
              <WeekStrip
                selectedKey={selectedKey}
                byDay={visibleByDay}
                onSelect={selectDay}
                onLongSelect={(key: string) => onCreateAt(key)}
              />
            </NavSwipe>
            <View
              style={styles.flex}
              onLayout={(e) => setDayHeight(e.nativeEvent.layout.height)}
            >
              {dayHeight > 0 && (
                <Pager
                  key={settings.dayLayout}
                  count={DAY_COUNT}
                  index={dayIndex}
                  width={width}
                  pageHeight={dayHeight}
                  style={styles.flex}
                  // en Liste, les cartes remplissent l'écran : le glissement
                  // leur revient, on navigue par la bande des jours au-dessus
                  swipeable={settings.dayLayout !== 'list'}
                  onIndexChange={(i) => selectDay(toKey(dayForIndex(i)))}
                  renderPage={(i) => dayPage(toKey(dayForIndex(i)))}
                />
              )}
            </View>
          </>
        );

      case 'list': {
        const days = Array.from({ length: 200 }, (_, i) => toKey(addDays(startOfToday(), i)));
        return (
          <PlannerList
            days={days}
            byDay={visibleByDay}
            onOpen={openEvent}
            onToggle={toggleDone}
            onRemove={onRemoveEvent}
            bottomInset={bottomInset}
            monthHeaders
          />
        );
      }

      default: {
        const gridHeight = cellHeight * 6 + 26;
        // la feuille tirée vers le haut laisse voir l'en-tête des jours et
        // deux semaines : assez pour garder ses repères dans le mois
        const sheetTop = Math.max(
          10,
          Math.min(gridHeight - MIN_SHEET_TRAVEL, 26 + cellHeight * 2),
        );

        return (
          <>
            <View style={{ height: gridHeight }}>
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
                      onLongSelect={(key: string) => onCreateAt(key)}
                      cellHeight={cellHeight}
                    />
                  </View>
                )}
              />
            </View>

            {settings.monthPanel === 'day' && bodyHeight > 0 && (
              <DaySheet
                label={dayLabel}
                events={dayEvents}
                onOpen={openEvent}
                onToggle={toggleDone}
                onRemove={onRemoveEvent}
                onCreate={() => onCreateAt(selectedKey)}
                topExpanded={sheetTop}
                topCollapsed={gridHeight}
                bodyHeight={bodyHeight}
                bottomInset={bottomInset}
              />
            )}
          </>
        );
      }
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/*
          Le titre est une zone de navigation à part entière : on y balaye
          pour reculer ou avancer d'un cran, quelle que soit la vue. C'est le
          geste de secours quand le corps de l'écran appartient aux cartes.
        */}
        <NavSwipe onStep={step} enabled={scale !== 'list'} style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {!isOnToday && (
            <View >
              <Squish
                style={[styles.iconBtn, { backgroundColor: `${ui.accent}1F` }]}
                onPress={goToday}
                scaleTo={0.93}
              >
                <Ionicons name="locate" size={18} color={ui.accent} />
              </Squish>
            </View>
          )}

          <Squish
            style={styles.iconBtn}
            scaleTo={0.93}
            onPress={() => {
              tapSoft();
              onOpenSettings();
            }}
          >
            <Ionicons name="options-outline" size={19} color={theme.inkSoft} />
          </Squish>
        </NavSwipe>

        <View style={styles.scaleBar}>
          <SegmentedRow value={scale} onChange={setScale} options={SCALES} size="lg" />
        </View>
      </View>

      <View style={styles.flex} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
        <View
          key={`${scale}-${settings.weekLayout}-${settings.monthPanel}-${settings.monthCells}`}
          style={styles.flex}
        >
          {body()}
        </View>
      </View>

      <OverlapSheet events={overlap} onClose={() => setOverlap(null)} onOpen={openEvent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 29, fontWeight: '800', color: theme.ink, letterSpacing: -0.9 },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.inkFaint,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...theme.shadow.soft,
  },
  scaleBar: { marginTop: 14 },
  monthPage: { paddingHorizontal: 10, paddingTop: 8 },
});
