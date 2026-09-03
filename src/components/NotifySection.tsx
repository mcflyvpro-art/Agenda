import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { hhmm } from '../lib/date';
import { tapLight, tapSoft } from '../lib/haptics';
import { alertLabel } from '../lib/repeat';
import { needsHomeScreen, useNotifyPrefs, usePushDevice } from '../notify/push';
import { useSettings } from '../store/settings';
import { theme } from '../theme';
import { Squish } from './Squish';
import { Toggle } from './Toggle';

/** Les préavis proposés par défaut sur un nouvel événement. */
const ALERT_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440];

/**
 * Les notifications, dans les réglages.
 *
 * Deux choses distinctes se règlent ici, et il vaut mieux les garder
 * séparées à l'œil : l'inscription de CET appareil (qui ne concerne que
 * lui) et les réglages du COMPTE (qui valent pour tous ses appareils à la
 * fois, puisque c'est le serveur qui envoie).
 */
export function NotifySection() {
  const { ui } = useSettings();
  const { supported, permission, active, busy, error, enable, disable, test } = usePushDevice();
  const { prefs, update, connected } = useNotifyPrefs();
  const [message, setMessage] = useState<string | null>(null);

  const bumpTime = (key: 'allDayTime' | 'quietFrom' | 'quietTo', delta: number) => {
    tapSoft();
    const v = (prefs[key] + delta + 1440) % 1440;
    update({ [key]: v } as any);
  };

  if (!connected) {
    return (
      <View style={styles.card}>
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={17} color={theme.inkFaint} />
          <Text style={styles.hint}>
            Connectez-vous d’abord : les rappels partent du serveur, vers les appareils de votre
            compte.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        {/* --- cet appareil --- */}
        <Squish
          style={styles.row}
          scaleTo={0.985}
          dimTo={1}
          onPress={() => {
            tapLight();
            setMessage(null);
            active ? disable() : enable();
          }}
        >
          <Ionicons
            name={active ? 'notifications' : 'notifications-off-outline'}
            size={18}
            color={active ? ui.accent : theme.inkFaint}
          />
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, active && { color: theme.ink }]}>
              Notifications sur cet appareil
            </Text>
            <Text style={styles.rowSub}>
              {active ? 'Inscrit — les rappels arrivent ici' : 'Désactivées ici'}
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator size="small" color={theme.inkSoft} />
          ) : (
            <Toggle value={active} onChange={() => (active ? disable() : enable())} />
          )}
        </Squish>

        {!supported && (
          <>
            <View style={styles.divider} />
            <Text style={styles.warn}>
              Ce navigateur ne sait pas recevoir de notifications.
            </Text>
          </>
        )}

        {supported && needsHomeScreen() && (
          <>
            <View style={styles.divider} />
            <Text style={styles.warn}>
              Sur iPhone, il faut d’abord ajouter Agenda à l’écran d’accueil (Partager → « Sur
              l’écran d’accueil »). Les notifications n’existent pas dans l’onglet Safari.
            </Text>
          </>
        )}

        {permission === 'denied' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.warn}>
              Les notifications sont refusées pour ce site. À réautoriser dans Réglages →
              Notifications.
            </Text>
          </>
        )}

        {!!error && (
          <>
            <View style={styles.divider} />
            <Text style={styles.warn}>{error}</Text>
          </>
        )}

        {active && (
          <>
            <View style={styles.divider} />
            <Squish
              style={styles.linkRow}
              scaleTo={0.985}
              dimTo={1}
              onPress={async () => {
                tapSoft();
                setMessage('Envoi…');
                setMessage(await test());
              }}
            >
              <Ionicons name="paper-plane-outline" size={17} color={theme.inkSoft} />
              <Text style={styles.linkText}>Envoyer une notification d’essai</Text>
            </Squish>
            {!!message && <Text style={styles.note}>{message}</Text>}
          </>
        )}
      </View>

      {/* --- réglages du compte --- */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="power-outline" size={18} color={prefs.enabled ? ui.accent : theme.inkFaint} />
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, prefs.enabled && { color: theme.ink }]}>
              Envoyer les rappels
            </Text>
            <Text style={styles.rowSub}>Vaut pour tous les appareils du compte</Text>
          </View>
          <Toggle value={prefs.enabled} onChange={(enabled) => update({ enabled })} />
        </View>

        <View style={styles.divider} />
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Rappels par défaut</Text>
          <Text style={styles.blockHint}>Posés d’office sur un nouvel événement.</Text>
          <View style={styles.pills}>
            {ALERT_CHOICES.map((m) => {
              const on = prefs.defaultAlerts.includes(m);
              return (
                <Squish
                  key={m}
                  scaleTo={0.95}
                  dimTo={1}
                  onPress={() => {
                    tapLight();
                    update({
                      defaultAlerts: on
                        ? prefs.defaultAlerts.filter((a) => a !== m)
                        : [...prefs.defaultAlerts, m].sort((a, b) => a - b),
                    });
                  }}
                  style={[styles.pill, on && { backgroundColor: ui.accent }]}
                >
                  <Text style={[styles.pillText, on && styles.pillOn]}>{alertLabel(m)}</Text>
                </Squish>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Événements « toute la journée »</Text>
          <Text style={styles.blockHint}>
            Ils n’ont pas d’heure : c’est ce réglage qui décide quand prévenir.
          </Text>
          <View style={styles.pills}>
            {(
              [
                [1, 'La veille'],
                [0, 'Le jour même'],
              ] as const
            ).map(([lead, label]) => {
              const on = prefs.allDayLead === lead;
              return (
                <Squish
                  key={lead}
                  scaleTo={0.95}
                  dimTo={1}
                  onPress={() => {
                    tapLight();
                    update({ allDayLead: lead });
                  }}
                  style={[styles.pill, on && { backgroundColor: ui.accent }]}
                >
                  <Text style={[styles.pillText, on && styles.pillOn]}>{label}</Text>
                </Squish>
              );
            })}
            <TimeStepper value={prefs.allDayTime} onBump={(d) => bumpTime('allDayTime', d)} />
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.block}>
          <View style={styles.blockHead}>
            <View style={styles.flex}>
              <Text style={styles.blockLabel}>Heures silencieuses</Text>
              <Text style={styles.blockHint}>Les rappels de cette plage ne sonnent pas.</Text>
            </View>
            <Toggle
              value={prefs.quietEnabled}
              onChange={(quietEnabled) => update({ quietEnabled })}
            />
          </View>
          {prefs.quietEnabled && (
            <View style={styles.pills}>
              <Text style={styles.small}>De</Text>
              <TimeStepper value={prefs.quietFrom} onBump={(d) => bumpTime('quietFrom', d)} />
              <Text style={styles.small}>à</Text>
              <TimeStepper value={prefs.quietTo} onBump={(d) => bumpTime('quietTo', d)} />
            </View>
          )}
        </View>
      </View>
    </>
  );
}

function TimeStepper({ value, onBump }: { value: number; onBump: (delta: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Squish scaleTo={0.9} onPress={() => onBump(-30)} style={styles.stepBtn}>
        <Ionicons name="remove" size={15} color={theme.inkSoft} />
      </Squish>
      <Text style={styles.stepValue}>{hhmm(value)}</Text>
      <Squish scaleTo={0.9} onPress={() => onBump(30)} style={styles.stepBtn}>
        <Ionicons name="add" size={15} color={theme.inkSoft} />
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 10,
    ...theme.shadow.soft,
  },
  divider: { height: 1, backgroundColor: theme.hairline },
  flex: { flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 14.5, fontWeight: '700', color: theme.inkSoft, letterSpacing: -0.2 },
  rowSub: { fontSize: 12, fontWeight: '500', color: theme.inkFaint },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  linkText: { fontSize: 14.5, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 13 },
  hint: { flex: 1, fontSize: 12.5, fontWeight: '500', color: theme.inkFaint, lineHeight: 17 },
  warn: { fontSize: 12.5, fontWeight: '600', color: '#9E1A41', lineHeight: 17, paddingVertical: 11 },
  note: { fontSize: 12, fontWeight: '600', color: theme.inkFaint, paddingBottom: 11 },

  block: { paddingVertical: 12, gap: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockLabel: { fontSize: 14, fontWeight: '700', color: theme.ink, letterSpacing: -0.2 },
  blockHint: { fontSize: 12, fontWeight: '500', color: theme.inkFaint, lineHeight: 16 },
  small: { fontSize: 13, fontWeight: '600', color: theme.inkSoft },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(32,32,43,0.05)',
  },
  pillText: { fontSize: 12.5, fontWeight: '700', color: theme.inkSoft, letterSpacing: -0.2 },
  pillOn: { color: '#FFFFFF' },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32,32,43,0.05)',
    borderRadius: 12,
  },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepValue: {
    minWidth: 46,
    textAlign: 'center',
    fontSize: 13.5,
    fontWeight: '800',
    color: theme.ink,
    fontVariant: ['tabular-nums'],
  },
});
