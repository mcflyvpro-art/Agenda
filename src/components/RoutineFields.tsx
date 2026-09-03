import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { addMonths, chipDay, fromKey, monthYearTitle, toKey } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { alertLabel, DEFAULT_REPEAT, repeatLabel, type Freq, type Repeat } from '../lib/repeat';
import { useSettings } from '../store/settings';
import type { Swatch } from '../theme';
import { theme } from '../theme';
import { MonthGrid } from './MonthGrid';
import { Squish } from './Squish';

/**
 * Le pupitre des routines et des rappels.
 *
 * Il est monté à part de la fiche parce qu'il double presque sa hauteur,
 * et qu'il ne concerne qu'une minorité d'événements. Les deux réglages
 * vivent ensemble parce qu'ils répondent à la même question — « et
 * ensuite ? » — et parce qu'un rappel sur une routine doit se lire d'un
 * seul coup d'œil avec elle.
 */

type Section = 'repeat' | 'alerts' | 'until' | null;

/** Les rappels proposés, en minutes avant le début. */
const ALERT_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];

const FREQS: { key: Freq | 'none'; label: string }[] = [
  { key: 'none', label: 'Jamais' },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
];

const UNIT: Record<Freq, [string, string]> = {
  day: ['jour', 'jours'],
  week: ['semaine', 'semaines'],
  month: ['mois', 'mois'],
  year: ['an', 'ans'],
};

const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NTH = ['1er', '2e', '3e', '4e', '5e'];

type Props = {
  /** la date de la fiche : elle ancre la série et nomme la règle */
  date: string;
  repeat: Repeat | null;
  alerts: number[];
  swatchOf: Swatch;
  section: Section;
  onSection: (s: Section) => void;
  onChange: (patch: { repeat?: Repeat | null; alerts?: number[] }) => void;
};

export function RoutineFields({
  date,
  repeat,
  alerts,
  swatchOf: c,
  section,
  onSection,
  onChange,
}: Props) {
  const { settings } = useSettings();
  const [untilMonth, setUntilMonth] = React.useState(() => fromKey(repeat?.until ?? date));

  const setRepeat = (patch: Partial<Repeat>) => {
    onChange({ repeat: { ...(repeat ?? DEFAULT_REPEAT), ...patch } });
  };

  const pickFreq = (key: Freq | 'none') => {
    tapLight();
    if (key === 'none') {
      onChange({ repeat: null });
      return;
    }
    // en passant à « semaine », le jour de la fiche est retenu d'office :
    // sans lui la série tomberait ailleurs que là où on vient de la poser
    const weekdays = key === 'week' ? [fromKey(date).getDay()] : [];
    onChange({ repeat: { ...(repeat ?? DEFAULT_REPEAT), freq: key, weekdays } });
  };

  const bump = (delta: number) => {
    if (!repeat) return;
    tapSoft();
    setRepeat({ interval: Math.max(1, Math.min(99, repeat.interval + delta)) });
  };

  const toggleWeekday = (wd: number) => {
    if (!repeat) return;
    tapLight();
    const has = repeat.weekdays.includes(wd);
    const next = has ? repeat.weekdays.filter((d) => d !== wd) : [...repeat.weekdays, wd];
    // tout décocher n'a pas de sens : la série retombe sur le jour de la fiche
    setRepeat({ weekdays: next.sort((a, b) => a - b) });
  };

  const toggleAlert = (m: number) => {
    tapLight();
    const has = alerts.includes(m);
    onChange({ alerts: has ? alerts.filter((a) => a !== m) : [...alerts, m].sort((a, b) => a - b) });
  };

  const endMode: 'never' | 'count' | 'until' = repeat?.count
    ? 'count'
    : repeat?.until
      ? 'until'
      : 'never';

  const setEnd = (mode: 'never' | 'count' | 'until') => {
    tapLight();
    if (mode === 'never') setRepeat({ count: null, until: null });
    else if (mode === 'count') setRepeat({ count: repeat?.count ?? 10, until: null });
    else {
      const d = addMonths(fromKey(date), 3);
      setUntilMonth(d);
      setRepeat({ until: repeat?.until ?? toKey(d), count: null });
    }
    if (mode !== 'until' && section === 'until') onSection('repeat');
  };

  const weekdayOrder = settings.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const startWeekday = fromKey(date).getDay();
  const nth = NTH[Math.floor((fromKey(date).getDate() - 1) / 7)] ?? '';

  return (
    <View style={styles.card}>
      <Row
        icon="repeat"
        label="Répéter"
        value={repeatLabel(repeat, date)}
        active={section === 'repeat' || section === 'until'}
        accent={c.deep}
        onPress={() => {
          tapSoft();
          onSection(section === 'repeat' || section === 'until' ? null : 'repeat');
        }}
      />

      {(section === 'repeat' || section === 'until') && (
        <View style={styles.panel}>
          <View style={styles.pills}>
            {FREQS.map((f) => {
              const on = f.key === 'none' ? !repeat : repeat?.freq === f.key;
              return (
                <Squish
                  key={f.key}
                  scaleTo={0.95}
                  dimTo={1}
                  onPress={() => pickFreq(f.key)}
                  style={[styles.pill, on && { backgroundColor: c.solid }]}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{f.label}</Text>
                </Squish>
              );
            })}
          </View>

          {!!repeat && (
            <>
              <View style={styles.stepRow}>
                <Text style={styles.stepLabel}>Tous les</Text>
                <View style={styles.stepper}>
                  <Squish scaleTo={0.9} onPress={() => bump(-1)} style={styles.stepBtn}>
                    <Ionicons name="remove" size={16} color={theme.inkSoft} />
                  </Squish>
                  <Text style={styles.stepValue}>{repeat.interval}</Text>
                  <Squish scaleTo={0.9} onPress={() => bump(1)} style={styles.stepBtn}>
                    <Ionicons name="add" size={16} color={theme.inkSoft} />
                  </Squish>
                </View>
                <Text style={styles.stepUnit}>
                  {UNIT[repeat.freq][repeat.interval > 1 ? 1 : 0]}
                </Text>
              </View>

              {repeat.freq === 'week' && (
                <View style={styles.days}>
                  {weekdayOrder.map((wd) => {
                    const on = repeat.weekdays.length
                      ? repeat.weekdays.includes(wd)
                      : wd === startWeekday;
                    return (
                      <Squish
                        key={wd}
                        scaleTo={0.9}
                        dimTo={1}
                        onPress={() => toggleWeekday(wd)}
                        style={[styles.day, on && { backgroundColor: c.solid }]}
                      >
                        <Text style={[styles.dayText, on && styles.pillTextOn]}>{WD[wd]}</Text>
                      </Squish>
                    );
                  })}
                </View>
              )}

              {repeat.freq === 'month' && (
                <View style={styles.pills}>
                  {(
                    [
                      ['date', `Le ${fromKey(date).getDate()}`],
                      ['weekday', `Le ${nth} ${['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][startWeekday]}.`],
                    ] as const
                  ).map(([key, label]) => {
                    const on = repeat.monthly === key;
                    return (
                      <Squish
                        key={key}
                        scaleTo={0.95}
                        dimTo={1}
                        onPress={() => {
                          tapLight();
                          setRepeat({ monthly: key });
                        }}
                        style={[styles.pill, on && { backgroundColor: c.solid }]}
                      >
                        <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
                      </Squish>
                    );
                  })}
                </View>
              )}

              <View style={styles.hair} />

              <Text style={styles.sub}>Fin</Text>
              <View style={styles.pills}>
                {(
                  [
                    ['never', 'Jamais'],
                    ['count', 'Après'],
                    ['until', 'Le'],
                  ] as const
                ).map(([key, label]) => {
                  const on = endMode === key;
                  return (
                    <Squish
                      key={key}
                      scaleTo={0.95}
                      dimTo={1}
                      onPress={() => setEnd(key)}
                      style={[styles.pill, on && { backgroundColor: c.solid }]}
                    >
                      <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
                    </Squish>
                  );
                })}
              </View>

              {endMode === 'count' && (
                <View style={styles.stepRow}>
                  <View style={styles.stepper}>
                    <Squish
                      scaleTo={0.9}
                      onPress={() => {
                        tapSoft();
                        setRepeat({ count: Math.max(1, (repeat.count ?? 10) - 1) });
                      }}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={16} color={theme.inkSoft} />
                    </Squish>
                    <Text style={styles.stepValue}>{repeat.count ?? 10}</Text>
                    <Squish
                      scaleTo={0.9}
                      onPress={() => {
                        tapSoft();
                        setRepeat({ count: Math.min(999, (repeat.count ?? 10) + 1) });
                      }}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="add" size={16} color={theme.inkSoft} />
                    </Squish>
                  </View>
                  <Text style={styles.stepUnit}>fois</Text>
                </View>
              )}

              {endMode === 'until' && (
                <>
                  <Squish
                    style={styles.untilRow}
                    scaleTo={0.985}
                    dimTo={1}
                    onPress={() => {
                      tapSoft();
                      onSection(section === 'until' ? 'repeat' : 'until');
                    }}
                  >
                    <Text style={styles.stepLabel}>Jusqu'au</Text>
                    <View style={[styles.chip, { backgroundColor: `${c.deep}1A` }]}>
                      <Text style={[styles.chipText, { color: c.deep }]}>
                        {chipDay(fromKey(repeat.until ?? date))}
                      </Text>
                    </View>
                  </Squish>

                  {section === 'until' && (
                    <View>
                      <View style={styles.pickerHeader}>
                        <Squish
                          style={styles.navBtn}
                          onPress={() => {
                            tapLight();
                            setUntilMonth((m) => addMonths(m, -1));
                          }}
                        >
                          <Ionicons name="chevron-back" size={17} color={theme.inkSoft} />
                        </Squish>
                        <Text style={styles.pickerTitle}>{monthYearTitle(untilMonth)}</Text>
                        <Squish
                          style={styles.navBtn}
                          onPress={() => {
                            tapLight();
                            setUntilMonth((m) => addMonths(m, 1));
                          }}
                        >
                          <Ionicons name="chevron-forward" size={17} color={theme.inkSoft} />
                        </Squish>
                      </View>
                      <MonthGrid
                        month={untilMonth}
                        selectedKey={repeat.until ?? date}
                        byDay={{}}
                        compact
                        cellHeight={40}
                        onSelect={(key) => {
                          setRepeat({ until: key, count: null });
                          setUntilMonth(fromKey(key));
                        }}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.divider} />

      <Row
        icon="notifications-outline"
        label="Rappels"
        value={
          alerts.length === 0
            ? 'Aucun'
            : alerts.length === 1
              ? alertLabel(alerts[0])
              : `${alerts.length} rappels`
        }
        active={section === 'alerts'}
        accent={c.deep}
        onPress={() => {
          tapSoft();
          onSection(section === 'alerts' ? null : 'alerts');
        }}
      />

      {section === 'alerts' && (
        <View style={styles.panel}>
          <View style={styles.pills}>
            {ALERT_CHOICES.map((m) => {
              const on = alerts.includes(m);
              return (
                <Squish
                  key={m}
                  scaleTo={0.95}
                  dimTo={1}
                  onPress={() => toggleAlert(m)}
                  style={[styles.pill, on && { backgroundColor: c.solid }]}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{alertLabel(m)}</Text>
                </Squish>
              );
            })}
          </View>
          <Text style={styles.note}>
            Plusieurs rappels possibles. Une notification part sur les appareils où ce compte
            est connecté.
          </Text>
        </View>
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  active,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Squish onPress={onPress} style={styles.row} scaleTo={0.985} dimTo={1}>
      <Ionicons name={icon} size={18} color={active ? accent : theme.inkFaint} />
      <Text style={[styles.rowLabel, active && { color: accent }]}>{label}</Text>
      <View style={[styles.chip, active && { backgroundColor: `${accent}1A` }]}>
        <Text numberOfLines={1} style={[styles.chipText, active && { color: accent }]}>
          {value}
        </Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={21} color={accent} />}
    </Squish>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...theme.shadow.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: theme.ink, letterSpacing: -0.2 },
  chip: {
    flexShrink: 1,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  chipText: { fontSize: 13.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.2 },
  divider: { height: 1, backgroundColor: theme.hairline, marginLeft: 27 },

  panel: { paddingBottom: 12, gap: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  pillText: { fontSize: 13, fontWeight: '700', color: theme.inkSoft, letterSpacing: -0.2 },
  pillTextOn: { color: '#FFFFFF' },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: theme.inkSoft },
  stepUnit: { fontSize: 14, fontWeight: '600', color: theme.inkSoft },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
    borderRadius: 12,
  },
  stepBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: theme.ink,
    fontVariant: ['tabular-nums'],
  },

  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  dayText: { fontSize: 13, fontWeight: '800', color: theme.inkSoft },

  hair: { height: 1, backgroundColor: theme.hairline, marginTop: 2 },
  sub: { fontSize: 12.5, fontWeight: '700', color: theme.inkFaint, letterSpacing: -0.1 },
  untilRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,32,43,0.04)',
  },

  note: { fontSize: 12, fontWeight: '500', color: theme.inkFaint, lineHeight: 16.5 },
});
