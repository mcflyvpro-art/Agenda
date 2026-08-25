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
