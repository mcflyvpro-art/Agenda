import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { tapSoft } from '../lib/haptics';
import { signIn, signOut, useAuthSession } from '../sync/auth';
import { theme } from '../theme';
import { Squish } from './Squish';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/**
 * La connexion à la synchronisation, dans les réglages.
 *
 * Se connecter n'est jamais un préalable pour utiliser l'app : sans
 * session, tout reste local, exactement comme avant. Ce bloc n'est que
 * l'endroit où, si on le souhaite, on branche le second appareil — le
 * même compte saisi ici et sur l'ordinateur relie les deux emplois du
 * temps.
 */
export function SyncSection() {
  const session = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) return null; // lecture de la session en cours

  if (session) {
    return (
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.statusText} numberOfLines={1}>
            {session.user.email}
          </Text>
        </View>
        <View style={styles.divider} />
        <Squish
          style={styles.linkRow}
          scaleTo={0.985}
          dimTo={1}
          onPress={() => {
            tapSoft();
            signOut();
          }}
        >
          <Ionicons name="log-out-outline" size={17} color={theme.inkSoft} />
          <Text style={styles.linkText}>Se déconnecter</Text>
        </Squish>
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
    <View style={styles.card}>
      <View style={styles.field}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Adresse e-mail"
          placeholderTextColor={theme.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[styles.input, noOutline]}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.field}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mot de passe"
          placeholderTextColor={theme.inkFaint}
          secureTextEntry
          style={[styles.input, noOutline]}
          onSubmitEditing={submit}
        />
      </View>
      {!!error && (
        <>
          <View style={styles.divider} />
          <Text style={styles.error}>{error}</Text>
        </>
      )}
      <View style={styles.divider} />
      <Squish style={styles.submitRow} scaleTo={0.985} dimTo={1} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.inkSoft} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={17} color={theme.ink} />
        )}
        <Text style={styles.submitText}>{busy ? 'Connexion…' : 'Se connecter'}</Text>
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

  field: { paddingVertical: 4 },
  input: {
    height: 40,
    fontSize: 14.5,
    fontWeight: '600',
    color: theme.ink,
    letterSpacing: -0.2,
  },
  error: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9E1A41',
    paddingVertical: 10,
  },

  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  submitText: { fontSize: 14.5, fontWeight: '700', color: theme.ink, letterSpacing: -0.2 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10BC6C' },
  statusText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.ink, letterSpacing: -0.2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  linkText: { fontSize: 14.5, fontWeight: '600', color: theme.inkSoft, letterSpacing: -0.2 },
});
