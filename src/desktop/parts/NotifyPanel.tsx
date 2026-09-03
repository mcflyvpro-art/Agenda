import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hhmm } from '../../lib/date';
import { alertLabel } from '../../lib/repeat';
import { useNotifyPrefs, usePushDevice } from '../../notify/push';
import { useSettings } from '../../store/settings';
import { alpha, dt } from '../theme';
import { Label, Press } from './Press';

/**
 * Les notifications, version bureau.
 *
 * Mêmes réglages que sur le téléphone, et c'est le but : ils vivent sur le
 * serveur, pas sur l'appareil. Ce qu'on change ici vaut immédiatement pour
 * le téléphone, et inversement — il n'y a qu'un jeu de réglages par compte.
 *
 * Seule l'inscription du haut est propre à cette machine : la cocher ici
 * fait arriver les rappels sur le Mac, sans rien retirer au téléphone.
 */

const ALERT_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440];

export function NotifyPanel() {
  const { ui } = useSettings();
  const { supported, permission, active, busy, error, enable, disable, test } = usePushDevice();
  const { prefs, update, connected } = useNotifyPrefs();
  const [message, setMessage] = useState<string | null>(null);

  if (!connected) {
    return (
      <Text style={styles.hint}>
        Connectez-vous d’abord : les rappels partent du serveur, vers les appareils du compte.
      </Text>
    );
  }

  const bump = (key: 'allDayTime' | 'quietFrom' | 'quietTo', delta: number) =>
    update({ [key]: (prefs[key] + delta + 1440) % 1440 } as any);

  return (
    <View style={styles.wrap}>
      <Press
        onPress={() => {
          setMessage(null);
          active ? disable() : enable();
        }}
        style={styles.row}
        hoverStyle={{ backgroundColor: 'rgba(32,32,43,0.035)' }}
        disabled={busy}
      >
        <Ionicons
          name={active ? 'notifications' : 'notifications-off-outline'}
          size={15}
          color={active ? ui.accent : dt.inkFaint}
        />
        <View style={styles.flex}>
          <Text style={[styles.rowLabel, active && { color: dt.ink }]}>Rappels sur ce Mac</Text>
          <Text style={styles.rowSub}>
            {active ? 'Inscrit — indépendant du téléphone' : 'Désactivés sur cette machine'}
          </Text>
        </View>
        <Switch on={active} accent={ui.accent} />
      </Press>

      {!supported && <Text style={styles.warn}>Ce navigateur ne gère pas les notifications.</Text>}
      {permission === 'denied' && (
        <Text style={styles.warn}>
          Notifications refusées pour ce site — à réautoriser dans les réglages du navigateur.
        </Text>
      )}
      {!!error && <Text style={styles.warn}>{error}</Text>}

      {active && (
        <>
          <Press
            onPress={async () => {
              setMessage('Envoi…');
              setMessage(await test());
            }}
            style={styles.linkBtn}
            hoverStyle={{ backgroundColor: alpha(ui.accent, 0.1) }}
          >
            <Ionicons name="paper-plane-outline" size={14} color={dt.inkSoft} />
            <Text style={styles.linkText}>Notification d’essai</Text>
          </Press>
          {!!message && <Text style={styles.note}>{message}</Text>}
        </>
      )}

      <View style={styles.hair} />

      <Press onPress={() => update({ enabled: !prefs.enabled })} style={styles.row}>
        <Ionicons
          name="power-outline"
          size={15}
          color={prefs.enabled ? ui.accent : dt.inkFaint}
        />
        <View style={styles.flex}>
          <Text style={[styles.rowLabel, prefs.enabled && { color: dt.ink }]}>
            Envoyer les rappels
          </Text>
          <Text style={styles.rowSub}>Vaut pour tous les appareils du compte</Text>
        </View>
        <Switch on={prefs.enabled} accent={ui.accent} />
      </Press>

      <View style={styles.field}>
        <Label>Rappels par défaut</Label>
        <View style={styles.pills}>
          {ALERT_CHOICES.map((m) => {
            const on = prefs.defaultAlerts.includes(m);
            return (
              <Pill
                key={m}
                on={on}
                accent={ui.accent}
                onPress={() =>
                  update({
                    defaultAlerts: on
                      ? prefs.defaultAlerts.filter((a) => a !== m)
                      : [...prefs.defaultAlerts, m].sort((a, b) => a - b),
                  })
                }
              >
                {alertLabel(m)}
              </Pill>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Label>Toute la journée</Label>
        <View style={styles.pills}>
          <Pill on={prefs.allDayLead === 1} accent={ui.accent} onPress={() => update({ allDayLead: 1 })}>
            La veille
          </Pill>
          <Pill on={prefs.allDayLead === 0} accent={ui.accent} onPress={() => update({ allDayLead: 0 })}>
            Le jour même
          </Pill>
          <Stepper value={prefs.allDayTime} onBump={(d) => bump('allDayTime', d)} />
        </View>
      </View>

      <Press onPress={() => update({ quietEnabled: !prefs.quietEnabled })} style={styles.row}>
        <Ionicons name="moon-outline" size={15} color={prefs.quietEnabled ? ui.accent : dt.inkFaint} />
        <View style={styles.flex}>
          <Text style={[styles.rowLabel, prefs.quietEnabled && { color: dt.ink }]}>
            Heures silencieuses
          </Text>
          <Text style={styles.rowSub}>Les rappels de cette plage ne sonnent pas</Text>
        </View>
        <Switch on={prefs.quietEnabled} accent={ui.accent} />
      </Press>

      {prefs.quietEnabled && (
        <View style={styles.pills}>
          <Text style={styles.small}>De</Text>
          <Stepper value={prefs.quietFrom} onBump={(d) => bump('quietFrom', d)} />
          <Text style={styles.small}>à</Text>
          <Stepper value={prefs.quietTo} onBump={(d) => bump('quietTo', d)} />
        </View>
      )}
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
      <Text style={[styles.pillText, on && { color: '#FFFFFF' }]}>{children}</Text>
    </Press>
  );
}

function Stepper({ value, onBump }: { value: number; onBump: (d: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Press onPress={() => onBump(-30)} style={styles.stepBtn} sink>
        <Text style={styles.stepSign}>−</Text>
      </Press>
      <Text style={styles.stepValue}>{hhmm(value)}</Text>
      <Press onPress={() => onBump(30)} style={styles.stepBtn} sink>
        <Text style={styles.stepSign}>+</Text>
      </Press>
    </View>
  );
}

function Switch({ on, accent }: { on: boolean; accent: string }) {
  return (
    <View style={[styles.toggle, on && { backgroundColor: accent }]}>
      <View style={[styles.knob, { transform: [{ translateX: on ? 14 : 0 }] }] as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: dt.gap.sm },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: dt.radius.sm,
  },
  rowLabel: { fontSize: 12, fontWeight: '700', color: dt.inkSoft },
  rowSub: { fontSize: 10.5, fontWeight: '500', color: dt.inkFaint, marginTop: 1 },

  field: { gap: 5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: dt.radius.xs,
    backgroundColor: dt.sunken,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: dt.inkSoft },
  small: { fontSize: 11, fontWeight: '600', color: dt.inkSoft },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dt.sunken,
    borderRadius: dt.radius.xs,
  },
  stepBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 12, fontWeight: '800', color: dt.inkSoft },
  stepValue: {
    minWidth: 38,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '800',
    color: dt.ink,
    fontVariant: ['tabular-nums'],
  },

  toggle: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: dt.lineStrong,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(40,34,62,0.25)',
  } as any,

  hair: { height: 1, backgroundColor: dt.line, marginVertical: 2 },
  hint: { fontSize: 11.5, fontWeight: '500', color: dt.inkFaint, lineHeight: 16 },
  warn: { fontSize: 11, fontWeight: '600', color: '#9E1A41', lineHeight: 15 },
  note: { fontSize: 11, fontWeight: '600', color: dt.inkFaint },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: dt.radius.sm,
  },
  linkText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: dt.inkSoft },
});
