import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesktopRoot } from './src/desktop/DesktopRoot';
import { DeskPrefsProvider } from './src/desktop/store/prefs';
import { useIsDesktop } from './src/lib/platform';
import { RootScreen } from './src/screens/RootScreen';
import { EventsProvider } from './src/store/events';
import { TodosProvider } from './src/store/todos';
import { SettingsProvider, useSettings } from './src/store/settings';
import { setAdapter, localOnly } from './src/sync/adapter';
import { useAuthSession } from './src/sync/auth';
import { primeDeviceId } from './src/sync/device';
import { useCloudSync } from './src/sync/engine';
import { supabaseAdapter } from './src/sync/supabase';

// l'identité de l'appareil est lue une fois, avant la première écriture
primeDeviceId();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <EventsProvider>
            <TodosProvider>
              <DeskPrefsProvider>
                <Shell />
              </DeskPrefsProvider>
              <StatusBar style="dark" />
            </TodosProvider>
          </EventsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * L'aiguillage entre les deux interfaces.
 *
 * Ce n'est pas une mise en page qui s'adapte : ce sont deux applications
 * distinctes, qui partagent leurs données et rien de leur dessin. Un
 * téléphone se tient à une main et se parcourt au pouce ; un ordinateur
 * se pilote au clavier, au trackpad et au survol, avec dix fois plus de
 * surface. Vouloir servir les deux avec les mêmes écrans revient à mal
 * servir l'un des deux, alors chacun a les siens — `src/screens` pour le
 * mobile, `src/desktop` pour l'ordinateur.
 */
function Shell() {
  const desktop = useIsDesktop();
  /*
    Se connecter n'est jamais un préalable : sans session, l'app tourne
    entièrement en local, exactement comme avant. La connexion, quand
    elle a lieu (depuis les réglages), ne fait que brancher le second
    dos — rien d'autre ne change dans le reste de l'application.
  */
  const session = useAuthSession();
  useEffect(() => {
    setAdapter(session ? supabaseAdapter : localOnly);
  }, [session]);
  useCloudSync(!!session);

  return desktop ? <DesktopRoot /> : <Backdrop />;
}

/** Le fond suit le jeu de couleurs choisi. */
function Backdrop() {
  const { ui } = useSettings();
  return (
    <View style={[styles.root, { backgroundColor: ui.gradient[0] }]}>
      <LinearGradient
        colors={ui.gradient}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <RootScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
