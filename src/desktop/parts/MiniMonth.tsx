import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  isSameMonth,
  monthMatrix,
  monthTitle,
  toKey,
  todayKey,
  weekdayLabels,
} from '../../lib/date';
import { useSettings } from '../../store/settings';
import { alpha, dt } from '../theme';
import { Press } from './Press';

type Props = {
  month: Date;
  selectedKey?: string;
  /** nombre d'événements par jour, pour la densité sous la date */
  countOn?: (key: string) => number;
  onSelectDay: (key: string) => void;
  onPressTitle?: () => void;
  cell?: number;
  showTitle?: boolean;
};

/**
 * Le mois en petit : la carte de navigation.
 *
 * Elle sert deux fois — dans la barre latérale, où elle permet de sauter
 * n'importe où sans changer d'échelle, et douze fois de suite dans la vue
 * Année. Une pastille sous les dates chargées suffit à faire apparaître la
 * forme d'un mois d'un coup d'œil ; en dire plus à cette taille ne serait
 * plus lisible.
 *
 * Trois états doivent rester distinguables dans un cercle de vingt-sept
 * pixels, ce qui interdit de les dire tous en aplat. Ils se répartissent
 * donc sur trois registres différents : aujourd'hui est un disque plein,
 * le jour choisi un anneau, et la charge une pastille sous le chiffre.
 * Rien ne se recouvre, et les trois peuvent tomber sur la même case sans
 * qu'aucun disparaisse.
 */
export function MiniMonth({
  month,
  selectedKey,
  countOn,
  onSelectDay,
  onPressTitle,
  cell = 27,
  showTitle = true,
}: Props) {
  const { settings, ui } = useSettings();
  const cells = useMemo(
    () => monthMatrix(month, settings.weekStart),
    [month, settings.weekStart],
  );
  const labels = weekdayLabels(settings.weekStart);
  const today = todayKey();

  // la sixième semaine ne sert que si elle touche encore le mois
  const rows = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    const last = out[out.length - 1];
    if (last && last.every((d) => !isSameMonth(d, month))) out.pop();
    return out;
  }, [cells, month]);

  const small = cell <= 24;

  return (
    <View>
      {showTitle && (
        <Press
          onPress={onPressTitle}
          style={styles.title}
          hoverStyle={onPressTitle ? undefined : null}
        >
          <Text style={styles.titleText}>{monthTitle(month)}</Text>
          {!!onPressTitle && (
            <Ionicons name="chevron-forward" size={11} color={dt.inkFaint} />
          )}
        </Press>
      )}
      <View style={styles.week}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.dow, { width: cell }]}>
            {l}
          </Text>
        ))}
      </View>
      {rows.map((week, r) => (
        <View key={r} style={styles.week}>
          {week.map((d) => {
            const key = toKey(d);
            const inMonth = isSameMonth(d, month);
            const isToday = key === today;
            const isSel = key === selectedKey;
            const n = countOn?.(key) ?? 0;
            return (
              <Press
                key={key}
                onPress={() => onSelectDay(key)}
                style={
                  [
                    styles.cell,
                    { width: cell, height: cell, borderRadius: cell / 2 },
                    isToday && {
                      backgroundColor: ui.today,
                      boxShadow: `0 2px 6px -1px ${alpha(ui.today, 0.55)}`,
                    },
                    isSel && !isToday && dt.ringIn(alpha(ui.accent, 0.6), 1.5),
                  ] as any
                }
                hoverStyle={isToday ? null : { backgroundColor: dt.hover }}
              >
                <Text
                  style={[
                    styles.num,
                    { fontSize: small ? 9.5 : 11 },
                    !inMonth && styles.out,
                    isSel && !isToday && { color: ui.accent, fontWeight: '800' },
                    isToday && styles.todayText,
                  ]}
                >
                  {d.getDate()}
                </Text>
                {n > 0 && (
                  <View
                    style={[
                      styles.dot,
                      {
                        bottom: small ? 2 : 3,
                        backgroundColor: isToday ? '#FFFFFF' : ui.accent,
                        opacity: inMonth ? 0.9 : 0.3,
                      },
                    ]}
                  />
                )}
              </Press>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: dt.radius.xs,
    marginBottom: 2,
  },
  titleText: { fontSize: 12.5, fontWeight: '800', color: dt.ink, letterSpacing: -0.25 },
  week: { flexDirection: 'row' },
  dow: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: dt.inkFaint,
    paddingVertical: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cell: { alignItems: 'center', justifyContent: 'center' },
  num: { fontWeight: '600', color: dt.ink, fontVariant: ['tabular-nums'] },
  out: { color: dt.inkFaint, opacity: 0.55 },
  todayText: { color: '#FFFFFF', fontWeight: '800' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
});
