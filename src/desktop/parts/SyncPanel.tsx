import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { signIn, signOut, useAuthSession } from '../../sync/auth';
import { useSettings } from '../../store/settings';
import { alpha, dt } from '../theme';
import { IconButton, Press } from './Press';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/**
 * La connexion à la synchronisation, côté bureau.
 *
 * Même logique que sur mobile (`SyncSection`), même compte à saisir des
 * deux côtés — seule la présentation change, aux dimensions du panneau
 * de réglages du bureau plutôt qu'à celles d'une feuille tactile.
 */
export function SyncPanel() {
  const session = useAuthSession();
  const { ui } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) return null;

  if (session) {
    return (
      <View style={styles.box}>
        <View style={styles.statusRow}>
          <View style={styles.dotWrap}>
            <View dataSet={{ dkAnim: 'beat' }} style={styles.halo} />
            <View style={styles.dot} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.statusLabel}>Connecté</Text>
            <Text numberOfLines={1} style={styles.statusText}>
              {session.user.email}
            </Text>
          </View>
          <IconButton onPress={() => signOut()} title="Se déconnecter">
            <Ionicons name="log-out-outline" size={15} color={dt.inkSoft} />
          </IconButton>
        </View>
      </View>
    );
  }

  const ready = !!email.trim() && !!password && !busy;

  const submit = async () => {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    const message = await signIn(email, password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <View style={styles.box}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Adresse e-mail"
        placeholderTextColor={dt.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={[styles.input, noOutline]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        placeholderTextColor={dt.inkFaint}
        secureTextEntry
        style={[styles.input, noOutline]}
        onSubmitEditing={submit}
      />
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#9E1A41" />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      <Press
        onPress={submit}
        style={
          [
            styles.submit,
            ready
              ? { backgroundColor: ui.accent, boxShadow: `0 3px 10px -3px ${alpha(ui.accent, 0.6)}` }
              : { backgroundColor: dt.panel },
          ] as any
        }
        hoverStyle={ready ? ({ transform: [{ translateY: -1 }] } as any) : undefined}
      >
        {busy ? (
          <ActivityIndicator size="small" color={ready ? '#FFFFFF' : dt.inkSoft} />
        ) : (
          <Ionicons
            name="cloud-upload-outline"
            size={14}
            color={ready ? '#FFFFFF' : dt.inkSoft}
          />
        )}
        <Text style={[styles.submitText, ready && styles.submitTextOn]}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 6, gap: 6 },
  flex: { flex: 1 },
  input: {
    height: 34,
    borderRadius: dt.radius.sm,
    backgroundColor: dt.panel,
    paddingHorizontal: 11,
    fontSize: 12.5,
    fontWeight: '600',
    color: dt.ink,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  error: { flex: 1, fontSize: 11.5, fontWeight: '600', color: '#9E1A41' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 34,
    borderRadius: dt.radius.sm,
  },
  submitText: { fontSize: 12.5, fontWeight: '700', color: dt.inkSoft },
  submitTextOn: { color: '#FFFFFF' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  dotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10BC6C' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10BC6C' },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: dt.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusText: { fontSize: 12.5, fontWeight: '700', color: dt.ink },
});
