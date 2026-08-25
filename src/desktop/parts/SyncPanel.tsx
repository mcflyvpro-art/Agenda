import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { signIn, signOut, useAuthSession } from '../../sync/auth';
import { dt } from '../theme';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) return null;

  if (session) {
    return (
      <View style={styles.box}>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text numberOfLines={1} style={styles.statusText}>
            {session.user.email}
          </Text>
          <IconButton onPress={() => signOut()} title="Se déconnecter">
            <Ionicons name="log-out-outline" size={15} color={dt.inkSoft} />
          </IconButton>
        </View>
      </View>
    );
  }

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
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Press onPress={submit} style={styles.submit}>
        {busy ? (
          <ActivityIndicator size="small" color={dt.inkSoft} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={14} color={dt.ink} />
        )}
        <Text style={styles.submitText}>{busy ? 'Connexion…' : 'Se connecter'}</Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 6, gap: 6 },
  input: {
    height: 32,
    borderRadius: dt.radius.sm,
    backgroundColor: dt.panel,
    paddingHorizontal: 10,
    fontSize: 12.5,
    fontWeight: '600',
    color: dt.ink,
  },
  error: { fontSize: 11.5, fontWeight: '600', color: '#9E1A41', paddingHorizontal: 2 },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 32,
    borderRadius: dt.radius.sm,
    backgroundColor: dt.panel,
  },
  submitText: { fontSize: 12.5, fontWeight: '700', color: dt.ink },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10BC6C' },
  statusText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: dt.ink },
});
