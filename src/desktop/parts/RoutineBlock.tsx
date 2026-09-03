import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { fromKey } from '../../lib/date';
import { alertLabel, DEFAULT_REPEAT, repeatLabel, type Freq, type Repeat } from '../../lib/repeat';
import { alpha, dt } from '../theme';
import { Label, Press } from './Press';

/**
 * Les routines et les rappels, version bureau.
 *
 * Même matière que sur le téléphone, mais posée à plat : trois cent
 * quarante pixels ne laissent pas la place à des panneaux qui s'ouvrent,
 * et une souris n'a pas besoin qu'on lui replie ce qu'elle peut atteindre
 * d'un clic. Les dates se tapent, comme partout ailleurs dans ce panneau.
 */

const FREQS: { key: Freq | 'none'; label: string }[] = [
  { key: 'none', label: 'Jamais' },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Sem.' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'An' },
];

const UNIT: Record<Freq, [string, string]> = {
  day: ['jour', 'jours'],
  week: ['semaine', 'semaines'],
  month: ['mois', 'mois'],
  year: ['an', 'ans'],
};

const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ALERT_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

type Props = {
  date: string;
  repeat: Repeat | null;
  alerts: number[];
  accent: string;
  weekStart: 0 | 1;
  onChange: (patch: { repeat?: Repeat | null; alerts?: number[] }) => void;
};

export function RoutineBlock({ date, repeat, alerts, accent, weekStart, onChange }: Props) {
  const setRepeat = (patch: Partial<Repeat>) =>
    onChange({ repeat: { ...(repeat ?? DEFAULT_REPEAT), ...patch } });

  const pickFreq = (key: Freq | 'none') => {
    if (key === 'none') return onChange({ repeat: null });
    // le jour de la fiche est retenu d'office en passant à « semaine »
    const weekdays = key === 'week' ? [fromKey(date).getDay()] : [];
    onChange({ repeat: { ...(repeat ?? DEFAULT_REPEAT), freq: key, weekdays } });
  };

  const endMode: 'never' | 'count' | 'until' = repeat?.count
    ? 'count'
    : repeat?.until
      ? 'until'
      : 'never';

  const order = weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const startWeekday = fromKey(date).getDay();

  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Label>Répéter</Label>
        <View style={styles.pills}>
          {FREQS.map((f) => {
            const on = f.key === 'none' ? !repeat : repeat?.freq === f.key;
            return (
              <Pill key={f.key} on={on} accent={accent} onPress={() => pickFreq(f.key)}>
                {f.label}
              </Pill>
            );
          })}
        </View>
      </View>

      {!!repeat && (
        <>
          <View style={styles.stepRow}>
            <Text style={styles.text}>Tous les</Text>
            <View style={styles.stepper}>
              <Press
                onPress={() => setRepeat({ interval: Math.max(1, repeat.interval - 1) })}
                style={styles.stepBtn}
                sink
              >
                <Text style={styles.stepSign}>−</Text>
              </Press>
              <Text style={styles.stepValue}>{repeat.interval}</Text>
              <Press
                onPress={() => setRepeat({ interval: Math.min(99, repeat.interval + 1) })}
                style={styles.stepBtn}
                sink
              >
                <Text style={styles.stepSign}>+</Text>
              </Press>
            </View>
            <Text style={styles.text}>{UNIT[repeat.freq][repeat.interval > 1 ? 1 : 0]}</Text>
          </View>

          {repeat.freq === 'week' && (
            <View style={styles.days}>
              {order.map((wd) => {
                const on = repeat.weekdays.length
                  ? repeat.weekdays.includes(wd)
                  : wd === startWeekday;
                return (
                  <Press
                    key={wd}
                    onPress={() =>
                      setRepeat({
                        weekdays: (repeat.weekdays.includes(wd)
                          ? repeat.weekdays.filter((d) => d !== wd)
                          : [...repeat.weekdays, wd]
                        ).sort((a, b) => a - b),
                      })
                    }
                    style={[styles.day, on && { backgroundColor: accent }]}
                    hoverStyle={on ? null : { backgroundColor: dt.lineStrong }}
                  >
                    <Text style={[styles.dayText, on && styles.on]}>{WD[wd]}</Text>
                  </Press>
                );
              })}
            </View>
          )}

          {repeat.freq === 'month' && (
            <View style={styles.pills}>
              <Pill
                on={repeat.monthly === 'date'}
                accent={accent}
                onPress={() => setRepeat({ monthly: 'date' })}
              >
                {`Le ${fromKey(date).getDate()}`}
              </Pill>
              <Pill
                on={repeat.monthly === 'weekday'}
                accent={accent}
                onPress={() => setRepeat({ monthly: 'weekday' })}
              >
                {`Le ${['1er', '2e', '3e', '4e', '5e'][Math.floor((fromKey(date).getDate() - 1) / 7)] ?? ''} ${['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][startWeekday]}.`}
              </Pill>
            </View>
          )}

          <View style={styles.field}>
            <Label>Fin</Label>
            <View style={styles.pills}>
              <Pill
                on={endMode === 'never'}
                accent={accent}
                onPress={() => setRepeat({ count: null, until: null })}
              >
                Jamais
              </Pill>
              <Pill
                on={endMode === 'count'}
                accent={accent}
                onPress={() => setRepeat({ count: repeat.count ?? 10, until: null })}
              >
                Après N fois
              </Pill>
              <Pill
                on={endMode === 'until'}
                accent={accent}
                onPress={() => setRepeat({ until: repeat.until ?? date, count: null })}
              >
                À une date
              </Pill>
            </View>
          </View>

          {endMode === 'count' && (
            <View style={styles.stepRow}>
              <View style={styles.stepper}>
                <Press
                  onPress={() => setRepeat({ count: Math.max(1, (repeat.count ?? 10) - 1) })}
                  style={styles.stepBtn}
                  sink
                >
                  <Text style={styles.stepSign}>−</Text>
                </Press>
                <Text style={styles.stepValue}>{repeat.count ?? 10}</Text>
                <Press
                  onPress={() => setRepeat({ count: Math.min(999, (repeat.count ?? 10) + 1) })}
                  style={styles.stepBtn}
                  sink
                >
                  <Text style={styles.stepSign}>+</Text>
                </Press>
              </View>
              <Text style={styles.text}>fois</Text>
            </View>
          )}

          {endMode === 'until' && (
            <TextInput
              value={repeat.until ?? ''}
              onChangeText={(until) => setRepeat({ until })}
              onBlur={() => {
                const d = fromKey(repeat.until ?? '');
                if (Number.isNaN(d.getTime())) setRepeat({ until: date });
              }}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={dt.inkFaint}
              style={[styles.input, noOutline]}
            />
          )}

          <Text style={styles.summary}>{repeatLabel(repeat, date)}</Text>
        </>
      )}

      <View style={styles.field}>
        <Label>Rappels</Label>
        <View style={styles.pills}>
          {ALERT_CHOICES.map((m) => {
            const on = alerts.includes(m);
            return (
              <Pill
                key={m}
                on={on}
                accent={accent}
                onPress={() =>
                  onChange({
                    alerts: on
                      ? alerts.filter((a) => a !== m)
                      : [...alerts, m].sort((a, b) => a - b),
                  })
                }
              >
                {alertLabel(m)}
              </Pill>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Pill({
  on,
  accent,
  onPress,
  children,
}: {
  on: boolean;
  accent: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Press
      onPress={onPress}
      style={[styles.pill, on && { backgroundColor: accent }]}
      hoverStyle={on ? null : { backgroundColor: alpha(accent, 0.12) }}
    >
      <Text style={[styles.pillText, on && styles.on]}>{children}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: dt.gap.sm },
  field: { gap: 5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: dt.radius.xs,
    backgroundColor: dt.sunken,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: dt.inkSoft },
  on: { color: '#FFFFFF' },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  text: { fontSize: 11.5, fontWeight: '600', color: dt.inkSoft },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dt.sunken,
    borderRadius: dt.radius.xs,
  },
  stepBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 13, fontWeight: '800', color: dt.inkSoft },
  stepValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: dt.ink,
    fontVariant: ['tabular-nums'],
  },

  days: { flexDirection: 'row', gap: 3 },
  day: {
    flex: 1,
    height: 24,
    borderRadius: dt.radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dt.sunken,
  },
  dayText: { fontSize: 11, fontWeight: '800', color: dt.inkSoft },

  input: {
    height: 30,
    borderRadius: dt.radius.sm,
    backgroundColor: dt.sunken,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    color: dt.ink,
  },
  summary: { fontSize: 11, fontWeight: '600', color: dt.inkFaint, lineHeight: 15 },
});
