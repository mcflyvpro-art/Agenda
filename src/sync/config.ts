/**
 * L'URL du projet et la clé publique (anon / publishable) de Supabase.
 *
 * Cette clé est faite pour être publique : elle voyage dans chaque page
 * servie au navigateur, quel que soit l'hébergeur. Ce qui protège les
 * données, c'est la Row Level Security posée sur les tables (`user_id =
 * auth.uid()`), pas le secret de cette clé. La clé `service_role`, elle,
 * contourne cette protection — elle n'a donc sa place nulle part dans ce
 * dossier, ni dans aucun fichier commité : le schéma a été posé une fois
 * pour toutes via l'intégration Supabase, pas depuis ce client.
 */
export const SUPABASE_URL = 'https://gpyobivglmscjlbfprlt.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweW9iaXZnbG1zY2psYmZwcmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTAxMjQsImV4cCI6MjEwMzI2NjEyNH0.wYwU0w9QpBz2RihIiQ_FqMxUaZXG36AbhxV9FpI3WRg';

/**
 * La moitié publique de la paire VAPID qui signe les notifications.
 *
 * Elle est publique par construction : le navigateur l'exige pour créer
 * un abonnement, et elle voyage donc dans chaque page. C'est la moitié
 * privée qui compte, et elle ne quitte jamais le serveur — elle vit dans
 * une table que seule la fonction `notify` peut lire.
 */
export const VAPID_PUBLIC_KEY =
  'BIJ7vjjUlCwQ8Hkl4PR3IqfYtUJ5saKuThZq5RV6w-5d7BLd6hNtAo7oS487otgm7mUeBMH7t4lGSyLfEp52Hxo';
