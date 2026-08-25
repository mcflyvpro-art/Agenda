import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Le client Supabase, partagé par l'authentification et la synchronisation.
 *
 * La session est confiée à `AsyncStorage` (qui, sur le web où tourne
 * cette app, s'appuie sur `localStorage`) : une fois connecté sur un
 * appareil, on le reste au prochain lancement, sans redemander le mot
 * de passe à chaque fois.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
