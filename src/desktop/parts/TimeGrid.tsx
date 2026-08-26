import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fromKey, hhmm, isWeekend, minutesNow, shortDay, todayKey } from '../../lib/date';
import { layoutDay } from '../../lib/layout';
import { useSettings } from '../../store/settings';
import type { AgendaEvent } from '../../types';
import { alpha, dt } from '../theme';
import { Press } from './Press';

const GUTTER = 60;
const HEAD = 50;
const ALLDAY_ROW = 28;
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
  /**
   * Un jour désigné volontairement — on a cliqué son en-tête.
   *
   * Séparé du suivant, et il faut y tenir : appuyer pour tracer un créneau
   * désigne aussi une colonne, mais on ne demande pas pour autant à voir
   * ce jour-là — on est en train d'y écrire. Confondre les deux faisait
   * basculer le panneau de droite sur le jour pendant le tracé, puis sur
   * la fiche au relâchement, soit un aller-retour visible pour rien.
   */
  onPickDay?: (key: string) => void;
  /** le jour que le tracé en cours vise : la sélection suit, rien d'autre */
  onDrawDay?: (key: string) => void;
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
 *
 * C'est aussi la vue la plus coûteuse de l'application : une semaine
 * chargée, c'est sept placements de colonnes recalculés à chaque rendu.
 * D'où deux précautions. Le placement est mémoïsé sur les jours affichés,
 * et l'heure courante — qui avance toute seule toutes les trente
 * secondes — vit dans son propre composant, pour qu'un battement de
 * pendule ne redessine pas cinquante événements au passage.
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
  onPickDay,
  onDrawDay,
  showNow = true,
}: Props) {
  const { swatch, ui, settings } = useSettings();
  const bodyRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  /** le créneau qu'on est en train de tracer */
  const [ghost, setGhost] = useState<{ col: number; from: number; to: number } | null>(null);

  const hours = Math.max(1, endHour - startHour);
  const bodyH = hours * hourHeight;
  const colW = days.length ? Math.max(0, (width - GUTTER) / days.length) : 0;
  const today = todayKey();
  const todayCol = days.indexOf(today);

  // à l'ouverture, on se pose sur l'heure courante plutôt qu'à minuit
  useEffect(() => {
    const target = ((minutesNow() - startHour * 60) / 60) * hourHeight - 180;
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
      onDrawDay?.(days[col]);

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
    [colW, days, minutesAt, onCreate, onDrawDay, endHour],
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

  /* Le placement des colonnes, calculé une fois par jeu de jours. */
  const placed = useMemo(
    () => days.map((key) => layoutDay(eventsOn(key)).positioned),
    [days, eventsOn],
  );

  const hourList = useMemo(
    () => Array.from({ length: hours + 1 }, (_, i) => startHour + i),
    [hours, startHour],
  );

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
              onPress={() => onPickDay?.(key)}
              style={[
                styles.headCell,
                { width: colW },
                i > 0 ? styles.headSep : null,
                settings.dimWeekend && isWeekend(d) ? styles.dim : null,
              ]}
            >
              <Text style={[styles.headDay, isToday && { color: ui.today, fontWeight: '800' }]}>
                {shortDay(d)}
              </Text>
              <View
                style={
                  [
                    styles.headNum,
                    isToday && {
                      backgroundColor: ui.today,
                      boxShadow: `0 2px 8px -2px ${alpha(ui.today, 0.7)}`,
                    },
                  ] as any
                }
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
                    kind="event"
                    style={[styles.allDayChip, { backgroundColor: c.wash }]}
                    hoverStyle={{ backgroundColor: alpha(c.solid, 0.28) }}
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

      <View style={styles.scrollWrap}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ height: bodyH }}
          showsVerticalScrollIndicator={false}
        >
          <View ref={bodyRef} style={[styles.body, { height: bodyH }]}>
            {/* la colonne du jour, très légèrement éclairée */}
            {todayCol >= 0 && colW > 0 && (
              <View
                pointerEvents="none"
                style={[
                  styles.todayCol,
                  {
                    left: GUTTER + todayCol * colW,
                    width: colW,
                    backgroundColor: alpha(ui.today, 0.035),
                  },
                ]}
              />
            )}

            {/* lignes des heures */}
            {hourList.map((h, i) => (
              <View key={h} style={[styles.hourRow, { top: i * hourHeight }]}>
                {/*
                  Les étiquettes chevauchent leur trait, sauf la première :
                  au sommet de la grille, il n'y a rien au-dessus du trait
                  pour l'accueillir, et elle se ferait couper en deux par
                  le bord. Celle-là passe donc dessous.
                */}
                <Text style={[styles.hourLabel, i === 0 && styles.hourLabelFirst]}>
                  {`${`${h}`.padStart(2, '0')}:00`}
                </Text>
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
                dataSet={{ dk: 'live' }}
                style={[
                  styles.ghost,
                  {
                    left: GUTTER + ghost.col * colW + 3,
                    width: Math.max(0, colW - 6),
                    top: ((ghost.from - startHour * 60) / 60) * hourHeight,
                    height: Math.max(16, ((ghost.to - ghost.from) / 60) * hourHeight),
                    borderColor: ui.accent,
                    backgroundColor: alpha(ui.accent, 0.1),
                  },
                ]}
              >
                <Text style={[styles.ghostText, { color: ui.accent }]}>
                  {hhmm(ghost.from)} – {hhmm(ghost.to)}
                </Text>
              </View>
            )}

            {/* les événements */}
            {placed.map((positioned, col) =>
              positioned.map(({ event, col: sub, cols }) => {
                const c = swatch(event.color);
                const top = ((event.start - startHour * 60) / 60) * hourHeight;
                const h = Math.max(18, ((event.end - event.start) / 60) * hourHeight - 2);
                const w = (colW - 8) / cols;
                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    tint={c}
                    showEmoji={settings.showEmoji}
                    selected={event.id === selectedId}
                    onPress={onSelectEvent}
                    top={top}
                    height={h}
                    left={GUTTER + col * colW + 4 + sub * w}
                    width={w - 2}
                  />
                );
              }),
            )}

            {/* l'heure qu'il est */}
            {showNow && todayCol >= 0 && (
              <NowLine
                startHour={startHour}
                endHour={endHour}
                hourHeight={hourHeight}
                color={ui.today}
              />
            )}
          </View>
        </ScrollView>

        {/* un voile très court sous l'en-tête : le contenu passe dessous, il ne s'y coupe pas */}
        <View pointerEvents="none" style={styles.topFade} />
      </View>
    </View>
  );
}

/**
 * Un événement posé dans la grille.
 *
 * Sorti dans son propre composant pour deux raisons. La première est
 * mécanique : mémoïsé, il ne se redessine que si sa propre position ou
 * son propre contenu change, et non chaque fois qu'un voisin bouge ou que
 * l'heure avance. La seconde est visuelle : les quatre états — au repos,
 * survolé, choisi, fait — se combinent tous par l'ombre, et il vaut mieux
 * composer cette valeur en un seul endroit que la répartir sur quatre
 * feuilles de style qui s'écraseraient l'une l'autre.
 */
const EventBlock = React.memo(function EventBlock({
  event,
  tint,
  showEmoji,
  selected,
  onPress,
  top,
  height,
  left,
  width,
}: {
  event: AgendaEvent;
  tint: { wash: string; solid: string; deep: string };
  showEmoji: boolean;
  selected: boolean;
  onPress: (e: AgendaEvent) => void;
  top: number;
  height: number;
  left: number;
  width: number;
}) {
  const ring = selected ? `0 0 0 1.5px ${tint.solid}, ` : '';
  return (
    <Press
      onPress={() => onPress(event)}
      kind="event"
      title={`${event.title} · ${hhmm(event.start)}–${hhmm(event.end)}`}
      style={
        [
          styles.event,
          {
            top,
            height,
            left,
            width,
            backgroundColor: tint.wash,
            opacity: event.done ? 0.5 : 1,
            boxShadow: `${ring}0 1px 2px ${alpha(tint.deep, 0.1)}`,
          },
        ] as any
      }
      hoverStyle={
        {
          boxShadow: `${ring}0 2px 4px ${alpha(tint.deep, 0.14)}, 0 10px 20px -8px ${alpha(tint.deep, 0.34)}`,
          transform: [{ translateY: -1 }],
        } as any
      }
    >
      <View style={[styles.eventBar, { backgroundColor: tint.solid }]} />
      {/* un reflet du haut vers le bas : ce qui empêche l'aplat de paraître plat */}
      <View pointerEvents="none" style={styles.eventSheen} />
      <View style={styles.eventBody}>
        <Text
          numberOfLines={height < 34 ? 1 : 2}
          style={[styles.eventTitle, { color: tint.deep }, event.done && styles.strike]}
        >
          {showEmoji ? `${event.emoji} ` : ''}
          {event.title}
        </Text>
        {height >= 46 && (
          <Text style={[styles.eventTime, { color: tint.deep }]}>
            {hhmm(event.start)} – {hhmm(event.end)}
          </Text>
        )}
      </View>
    </Press>
  );
});

/**
 * L'heure qu'il est, sur sa propre horloge.
 *
 * Elle avance toutes les trente secondes ; la sortir du corps de la
 * grille fait que ce battement ne coûte qu'un trait redessiné, au lieu
 * d'un rendu complet de la semaine. Le point qui la termine bat lentement
 * — deux secondes et demie par cycle — parce qu'un repère qui vit se
 * retrouve du regard bien plus vite qu'un trait immobile.
 */
function NowLine({
  startHour,
  endHour,
  hourHeight,
  color,
}: {
  startHour: number;
  endHour: number;
  hourHeight: number;
  color: string;
}) {
  const [now, setNow] = useState(minutesNow);

  useEffect(() => {
    const t = setInterval(() => setNow(minutesNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (now < startHour * 60 || now > endHour * 60) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.nowRow, { top: ((now - startHour * 60) / 60) * hourHeight }]}
    >
      <View style={[styles.nowPill, { backgroundColor: color }]}>
        <Text style={styles.nowText}>{hhmm(now)}</Text>
      </View>
      <View style={styles.nowDotWrap}>
        <View dataSet={{ dkAnim: 'beat' }} style={[styles.nowHalo, { backgroundColor: color }]} />
        <View style={[styles.nowDot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.nowLine, { backgroundColor: color }]} />
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
  headCell: { height: HEAD, alignItems: 'center', justifyContent: 'center', gap: 2 },
  headSep: { borderLeftWidth: 1, borderLeftColor: dt.line },
  headDay: {
    fontSize: 10,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headNum: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headNumText: { fontSize: 14, fontWeight: '700', color: dt.ink, letterSpacing: -0.3 },
  headNumToday: { color: '#FFFFFF', fontWeight: '800' },
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
    paddingRight: 10,
    textAlign: 'right',
    fontSize: 9.5,
    fontWeight: '700',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  allDayCell: { paddingHorizontal: 3, gap: 2 },
  allDayChip: { borderRadius: dt.radius.xs, paddingHorizontal: 7, paddingVertical: 3 },
  allDayText: { fontSize: 11, fontWeight: '700' },

  scrollWrap: { flex: 1, position: 'relative' },
  scroll: { flex: 1 },
  topFade: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    top: 0,
    height: 10,
    backgroundImage: 'linear-gradient(rgba(32,32,43,0.05), rgba(32,32,43,0))',
  } as any,

  body: { position: 'relative' },
  todayCol: { position: 'absolute', top: 0, bottom: 0 },
  hourRow: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row' },
  hourLabel: {
    width: GUTTER,
    marginTop: -6,
    paddingRight: 12,
    textAlign: 'right',
    fontSize: 10.5,
    fontWeight: '600',
    color: dt.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  hourLabelFirst: { marginTop: 3 },
  hourLine: { flex: 1, height: 1, backgroundColor: dt.line },
  halfLine: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(32,32,43,0.025)',
  },
  col: { position: 'absolute', top: 0, bottom: 0 },
  colSep: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: dt.line },

  ghost: {
    position: 'absolute',
    borderRadius: dt.radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 7,
    paddingTop: 2,
    justifyContent: 'flex-start',
    zIndex: 4,
  },
  ghostText: { fontSize: 10.5, fontWeight: '800', fontVariant: ['tabular-nums'] },

  event: {
    position: 'absolute',
    borderRadius: dt.radius.sm,
    overflow: 'hidden',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 3,
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  eventSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 22,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0))',
  } as any,
  eventBody: { flex: 1, justifyContent: 'flex-start' },
  eventTitle: { fontSize: 11.5, fontWeight: '700', letterSpacing: -0.2 },
  strike: { textDecorationLine: 'line-through' },
  eventTime: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },

  nowRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 6,
  },
  nowPill: {
    position: 'absolute',
    left: 6,
    top: -8,
    height: 16,
    minWidth: 40,
    paddingHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  nowDotWrap: {
    position: 'absolute',
    left: GUTTER - 3,
    width: 7,
    height: 7,
    top: -3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowHalo: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  nowDot: { width: 7, height: 7, borderRadius: 4 },
  nowLine: { position: 'absolute', left: GUTTER, right: 0, height: 1.5, opacity: 0.9 },
});
