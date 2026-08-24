import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayMonth, fromKey, getISOWeek, hhmm, shortDay, todayKey } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { layoutDay } from '../lib/layout';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import type { AgendaEvent } from '../types';
import { Squish } from './Squish';

type Props = {
  visible: boolean;
  /** les sept jours de la semaine affichée, du lundi au dimanche */
  days: string[];
  eventsOn: (key: string) => AgendaEvent[];
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

const GUTTER = 46;
const HEADER = 44;
/** repli quand la semaine est vide : les heures où il se passe des choses */
const EMPTY: [number, number] = [8, 20];

/**
 * La semaine en grand, à plat.
 *
 * Un emploi du temps se lit d'un bloc — sept colonnes de front — et un
 * téléphone tenu debout n'en a pas la largeur. Cette vue fait donc pivoter
 * son contenu d'un quart de tour : on tourne l'appareil, et la grille
 * occupe tout l'écran, dans le bon sens. C'est un choix délibéré plutôt
 * qu'une rotation demandée au système : iOS ne la donne pas à une page
 * web, et une app installée en mode portrait ne pivotera jamais.
 *
 * Rien ne défile : les heures sont comprimées pour que la semaine entière
 * tienne d'un seul tenant, sans quoi « voir toute la semaine » n'aurait
 * plus de sens.
 *
 * La rotation physique du téléphone n'est jamais écoutée pendant que la
 * feuille est ouverte : les dimensions sont figées une seule fois, à
 * l'ouverture. Un navigateur mobile ne verrouille pas fiablement
 * l'orientation (l'API existe sur Android, pas sur Safari iOS), donc
 * laisser le composant réagir en direct au vrai pivot du téléphone le
 * faisait recalculer sa mise en page en plein mouvement — l'origine du
 * bug. Ici, tourner l'appareil ne change plus rien : c'est uniquement le
 * dessin, déjà couché, qui donne l'impression du paysage.
 */
export function WeekBoard({ visible, days, eventsOn, onPrev, onNext, onClose }: Props) {
  const { settings, swatch, ui } = useSettings();

  const [frame, setFrame] = useState(() => Dimensions.get('window'));
  useEffect(() => {
    if (visible) setFrame(Dimensions.get('window'));
  }, [visible]);
  const winW = frame.width;
  const winH = frame.height;

  // le cadre couché : on échange les deux dimensions de l'écran
  const portrait = winH >= winW;
  const W = portrait ? winH : winW;
  const H = portrait ? winW : winH;

  /** l'événement dont on a demandé le détail, dans un petit volet flottant */
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);
  // changer de semaine invalide la sélection : l'événement affiché n'est plus sous les yeux
  useEffect(() => {
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join('|')]);

  const all = useMemo(() => days.flatMap(eventsOn), [days, eventsOn]);

  const [startHour, endHour] = useMemo(() => {
    const timed = all.filter((e) => !e.allDay);
    if (timed.length === 0) return EMPTY;
    const first = Math.floor(Math.min(...timed.map((e) => e.start)) / 60);
    const last = Math.ceil(Math.max(...timed.map((e) => e.end)) / 60);
    return [Math.max(0, first - 1), Math.min(24, last + 1)] as [number, number];
  }, [all]);

  const hours = endHour - startHour;
  const gridW = W - GUTTER - 20;
  const colW = gridW / 7;
  const gridH = H - HEADER - 36;
  const hourH = gridH / Math.max(1, hours);

  const first = days.length ? fromKey(days[0]) : new Date();
  const last = days.length ? fromKey(days[6]) : new Date();

  return (
    <Modal visible={visible} transparent={false} animationType="none" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.stage}>
        <View
          style={[
            styles.board,
            {
              width: W,
              height: H,
              /* Le cadre couché est posé de sorte que son centre tombe déjà
                 sur celui de l'écran ; le quart de tour se fait alors autour
                 de ce centre et l'empreinte obtenue épouse exactement le
                 viewport, sans décalage à rattraper. */
              left: (winW - W) / 2,
              top: (winH - H) / 2,
            },
            portrait ? { transform: [{ rotate: '90deg' }] } : null,
          ]}
        >
          <View style={styles.head}>
            <Squish style={styles.navBtn} scaleTo={0.9} onPress={() => { tapLight(); onPrev(); }}>
              <Ionicons name="chevron-back" size={20} color={theme.ink} />
            </Squish>

            <View style={styles.headText}>
              <Text style={styles.title}>Semaine {getISOWeek(first)}</Text>
              <Text style={styles.range}>
                {dayMonth(first)} – {dayMonth(last)}
              </Text>
            </View>

            <Squish style={styles.navBtn} scaleTo={0.9} onPress={() => { tapLight(); onNext(); }}>
              <Ionicons name="chevron-forward" size={20} color={theme.ink} />
            </Squish>

            <Squish
              style={[styles.close, { backgroundColor: `${ui.accent}18` }]}
              scaleTo={0.9}
              onPress={() => { tapSoft(); onClose(); }}
            >
              <Ionicons name="close" size={19} color={ui.accent} />
            </Squish>
          </View>

          <View style={styles.grid}>
            {/* colonne des heures */}
            {Array.from({ length: hours + 1 }, (_, i) => startHour + i).map((h, i) => (
              <View key={h} style={[styles.hourRow, { top: i * hourH }]}>
                <Text style={styles.hourLabel}>{`${`${h}`.padStart(2, '0')}h`}</Text>
                <View style={styles.hourLine} />
              </View>
            ))}

            {/* en-têtes de jour + séparateurs */}
            {days.map((key, col) => {
              const d = fromKey(key);
              const today = key === todayKey();
              return (
                <View key={`col-${key}`} style={[styles.col, { left: GUTTER + col * colW, width: colW }]}>
                  <View style={[styles.dayHead, today && { backgroundColor: `${ui.today}1A` }]}>
                    <Text style={[styles.dayName, today && { color: ui.today }]}>{shortDay(d)}</Text>
                    <Text style={[styles.dayNum, today && { color: ui.today }]}>{d.getDate()}</Text>
                  </View>
                  {col > 0 && <View style={styles.colSep} />}
                </View>
              );
            })}

            {/* les événements */}
            {days.map((key, col) => {
              const { positioned } = layoutDay(eventsOn(key));
              return positioned.map(({ event, col: sub, cols }) => {
                const c = swatch(event.color);
                const top = ((event.start - startHour * 60) / 60) * hourH;
                const h = Math.max(16, ((event.end - event.start) / 60) * hourH - 2);
                const w = (colW - 6) / cols;
                return (
                  <Squish
                    key={event.id}
                    scaleTo={0.95}
                    dimTo={1}
                    onPress={() => {
                      tapLight();
                      setSelected(event);
                    }}
                    style={[
                      styles.event,
                      {
                        top: top + HEADER,
                        left: GUTTER + col * colW + 3 + sub * w,
                        width: w - 2,
                        height: h,
                        backgroundColor: c.wash,
                        opacity: event.done ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.eventBar, { backgroundColor: c.solid }]} />
                    <View style={styles.eventBody}>
                      {h >= 30 && (
                        <Text numberOfLines={1} style={[styles.eventTitle, { color: c.deep }]}>
                          {settings.showEmoji ? `${event.emoji} ` : ''}
                          {event.title}
                        </Text>
                      )}
                      {h >= 44 && (
                        <Text style={[styles.eventTime, { color: c.deep }]}>
                          {hhmm(event.start)} – {hhmm(event.end)}
                        </Text>
                      )}
                      {h < 30 && settings.showEmoji && (
                        <Text style={styles.eventGlyph}>{event.emoji}</Text>
                      )}
                    </View>
                  </Squish>
                );
              });
            })}
          </View>

          {/*
            Le détail d'un événement, en petit : la grille est trop tassée
            en paysage pour tout y écrire, alors un tap ouvre juste ce qu'il
            manque — le titre en entier et les horaires — dans un volet qui
            flotte sans rien recouvrir d'autre. Un tap n'importe où ailleurs
            le referme.
          */}
          {selected && (
            <>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setSelected(null)}
              />
              <View pointerEvents="box-none" style={styles.popupLayer}>
                <View style={[styles.popup, { backgroundColor: swatch(selected.color).wash }]}>
                  <View style={[styles.popupBar, { backgroundColor: swatch(selected.color).solid }]} />
                  {settings.showEmoji && <Text style={styles.popupEmoji}>{selected.emoji}</Text>}
                  <View style={styles.popupText}>
                    <Text
                      numberOfLines={1}
                      style={[styles.popupTitle, { color: swatch(selected.color).deep }]}
                    >
                      {selected.title}
                    </Text>
                    <Text style={[styles.popupTime, { color: swatch(selected.color).deep }]}>
                      {selected.allDay
                        ? 'Toute la journée'
                        : `${hhmm(selected.start)} – ${hhmm(selected.end)}`}
                    </Text>
                  </View>
                  <Squish
                    style={styles.popupClose}
                    scaleTo={0.88}
                    onPress={() => setSelected(null)}
                  >
                    <Ionicons name="close" size={14} color={swatch(selected.color).deep} />
                  </Squish>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#FBF6F4', overflow: 'hidden' },
  board: { position: "absolute", paddingHorizontal: 10, paddingBottom: 8 },
  head: {
    height: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  headText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  range: { fontSize: 11, fontWeight: '600', color: theme.inkFaint, marginTop: 1 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flex: 1 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    marginTop: HEADER - 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: GUTTER,
    paddingRight: 8,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    color: theme.inkFaint,
    fontVariant: ['tabular-nums'],
  },
  hourLine: { flex: 1, height: 1, backgroundColor: theme.hairline },
  col: { position: 'absolute', top: 0, bottom: 0 },
  dayHead: {
    height: HEADER - 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  dayName: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.inkFaint,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayNum: { fontSize: 14, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  colSep: { position: 'absolute', left: 0, top: HEADER - 8, bottom: 0, width: 1, backgroundColor: theme.hairline },
  event: { position: 'absolute', borderRadius: 7, overflow: 'hidden', paddingLeft: 7, paddingRight: 4 },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  eventBody: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 10.5, fontWeight: '700', letterSpacing: -0.2 },
  eventTime: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.85,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  eventGlyph: { fontSize: 11, textAlign: 'center' },
  popupLayer: {
    position: 'absolute',
    top: HEADER + 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    overflow: 'hidden',
    ...theme.shadow.lift,
  },
  popupBar: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2 },
  popupEmoji: { fontSize: 15 },
  popupText: { flexShrink: 1 },
  popupTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  popupTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    opacity: 0.85,
    fontVariant: ['tabular-nums'],
  },
  popupClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
