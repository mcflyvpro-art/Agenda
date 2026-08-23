import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootScreen } from './src/screens/RootScreen';
import { EventsProvider } from './src/store/events';
import { TodosProvider } from './src/store/todos';
import { SettingsProvider, useSettings } from './src/store/settings';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <EventsProvider>
            <TodosProvider>
              <Backdrop />
              <StatusBar style="dark" />
            </TodosProvider>
          </EventsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
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
