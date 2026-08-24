import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fromKey, hhmm, shortDay, todayKey } from '../lib/date';
import { tapLight, tapMedium, tapSoft } from '../lib/haptics';
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
const DAY_HEAD = 34;
/** repli quand la semaine est vide : les heures où il se passe des choses */
const EMPTY: [number, number] = [8, 20];

/** un tap ne doit presque pas bouger ; au-delà, c'est un balayage */
const TAP_SLOP = 12;
/** trois taps qui ne tiennent pas dans cette fenêtre ne comptent pas comme un triple tap */
const TRIPLE_TAP_WINDOW = 550;
/** distance à partir de laquelle un balayage change de semaine */
const SWIPE_DIST = 46;
/** ou, plus court mais assez vif (en pixels par milliseconde) */
const SWIPE_VELOCITY = 0.5;

/**
 * La semaine en grand, à plat, plein écran.
 *
 * Un emploi du temps se lit d'un bloc — sept colonnes de front — et un
 * téléphone tenu debout n'en a pas la largeur. Cette vue fait donc pivoter
 * son contenu d'un quart de tour : on tient le téléphone en portrait, et
 * le dessin est déjà couché, dans le bon sens pour qui le regarderait de
 * côté. Rien ne défile : les heures se compriment pour que la semaine
 * entière tienne d'un coup.
 *
 * Aucune barre, aucune flèche : on change de semaine par balayage, on
 * quitte par un triple tap. Deux gestes qui vivent entièrement en dehors
 * de React Native — de simples écouteurs DOM — pour ne jamais se
 * disputer le toucher avec les cartes d'événements ni avec quoi que ce
 * soit d'autre à l'écran ; ils se contentent d'observer, jamais de
 * capturer.
 *
 * Sur la rotation : impossible de la verrouiller. Safari sur iPhone ne
 * donne à une page web aucun moyen de bloquer l'orientation — cette API
 * n'existe que sur Chrome/Android, et seulement pour une app installée.
 * Ce qui est garanti ici, c'est que la mise en page suit toujours la
 * taille réelle de l'écran, sans jamais rester figée sur une valeur
 * périmée : si le téléphone tourne pour de vrai pendant que ce volet est
 * ouvert, l'affichage s'y adapte proprement plutôt que de se déchirer.
 */
export function WeekBoard({ visible, days, eventsOn, onPrev, onNext, onClose }: Props) {
  const { settings, swatch, ui } = useSettings();
  const { width: winW, height: winH } = useWindowDimensions();

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

  /*
    Balayer pour changer de semaine, taper trois fois vite pour sortir —
    tous deux en dehors de React Native, via de simples écouteurs sur le
    document. Une carte d'événement (un Pressable ordinaire) et ce volet
    partagent alors deux systèmes de toucher différents ; les mêler dans
    le système de gestes de React Native avait déjà, ailleurs dans l'app,
    bloqué net des taps qui n'avaient rien à voir. Un écouteur qui ne fait
    qu'observer, sans jamais intercepter, ne peut pas reproduire ce bug.
  */
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const onCloseRef = useRef(onClose);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    let start: { x: number; y: number; t: number } | null = null;
    let taps: number[] = [];

    const onDown = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, t: Date.now() };
    };

    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Date.now() - start.t;
      start = null;

      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
        // c'est un tap : on le compte pour le triple tap de sortie
        const now = Date.now();
        taps.push(now);
        taps = taps.filter((t) => now - t <= TRIPLE_TAP_WINDOW);
        if (taps.length >= 3) {
          taps = [];
          tapMedium();
          onCloseRef.current();
        }
        return;
      }

      /*
        La direction pertinente dépend de la présentation : couché en
        portrait, le dessin est pré-tourné d'un quart de tour, donc « à
        droite / à gauche » à l'écran (visuellement) correspond à « en bas
        / en haut » sur l'écran réel — c'est exactement la conversion que
        décrit le pivot appliqué plus bas au rendu.
      */
      const delta = portrait ? dy : dx;
      const fast = dt > 0 && Math.abs(delta) / dt > SWIPE_VELOCITY;
      if (delta < 0 && (Math.abs(delta) > SWIPE_DIST || fast)) {
        tapSoft();
        onNextRef.current();
      } else if (delta > 0 && (delta > SWIPE_DIST || fast)) {
        tapSoft();
        onPrevRef.current();
      }
    };

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
    };
  }, [visible, portrait]);

  const all = useMemo(() => days.flatMap(eventsOn), [days, eventsOn]);

  const [startHour, endHour] = useMemo(() => {
    const timed = all.filter((e) => !e.allDay);
    if (timed.length === 0) return EMPTY;
    const first = Math.floor(Math.min(...timed.map((e) => e.start)) / 60);
    const last = Math.ceil(Math.max(...timed.map((e) => e.end)) / 60);
    return [Math.max(0, first - 1), Math.min(24, last + 1)] as [number, number];
  }, [all]);

  const hours = endHour - startHour;
  const gridW = W - GUTTER - 14;
  const colW = gridW / 7;
  const gridH = H - DAY_HEAD - 20;
  const hourH = gridH / Math.max(1, hours);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      onRequestClose={() => onCloseRef.current()}
      supportedOrientations={['portrait', 'landscape']}
    >
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
                        top: top + DAY_HEAD,
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
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
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
                  <Squish style={styles.popupClose} scaleTo={0.88} onPress={() => setSelected(null)}>
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
  board: { position: 'absolute', backgroundColor: '#FBF6F4', paddingHorizontal: 8, paddingVertical: 6 },
  grid: { flex: 1 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    marginTop: DAY_HEAD - 7,
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
    height: DAY_HEAD - 6,
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
  colSep: { position: 'absolute', left: 0, top: DAY_HEAD - 4, bottom: 0, width: 1, backgroundColor: theme.hairline },
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
    top: DAY_HEAD + 14,
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
