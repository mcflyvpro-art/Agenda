import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { uid } from '../lib/id';

const DEVICE_KEY = 'agenda.device.v1';

let cached: string | null = null;

/**
 * L'identité de cet appareil, stable d'un lancement à l'autre.
 *
 * Elle sert à reconnaître ses propres écritures quand elles reviennent du
 * serveur. Générée une fois, jamais renvoyée ailleurs qu'à la base de la
 * personne qui l'utilise — ce n'est pas un identifiant de suivi, juste un
 * moyen pour deux appareils d'une même personne de ne pas se marcher
 * dessus.
 */
export async function deviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    /* stockage illisible : on repart d'un identifiant neuf */
  }
  const fresh = uid();
  cached = fresh;
  AsyncStorage.setItem(DEVICE_KEY, fresh).catch(() => {});
  return fresh;
}

/** Valeur immédiate, pour les écritures qui ne peuvent pas attendre. */
export function deviceIdSync(): string {
  return cached ?? 'inconnu';
}

/** À charger une fois au démarrage pour que `deviceIdSync` dise vrai. */
export function primeDeviceId(): void {
  deviceId().catch(() => {});
}

/** Un nom lisible, pour dire « modifié sur le Mac » plutôt qu'un identifiant. */
export function deviceLabel(): string {
  if (Platform.OS === 'ios') return 'iPhone';
  if (Platform.OS === 'android') return 'Android';
  if (typeof navigator === 'undefined') return 'Ordinateur';
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC';
  return 'Ordinateur';
}
