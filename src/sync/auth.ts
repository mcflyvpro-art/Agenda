import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * La session Supabase, tenue à jour en continu.
 *
 * `undefined` tant qu'on ne sait pas encore (lecture du stockage en
 * cours), `null` une fois qu'on sait qu'il n'y en a pas, la session sinon.
 * Cette distinction en trois états évite d'afficher un bref écran de
 * connexion à chaque lancement, le temps que la session déjà enregistrée
 * se relise.
 */
export function useAuthSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}

/** Renvoie un message d'erreur lisible, ou `null` si la connexion a réussi. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return null;
  if (error.message.includes('Invalid login credentials')) return 'Adresse ou mot de passe incorrect.';
  return 'Connexion impossible pour le moment.';
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
