import type { ColorKey } from '../theme';

type Rule = { words: string[]; emoji: string; color: ColorKey };

/**
 * Devine un emoji et une couleur à partir de ce qui est écrit.
 * Rien de magique : une liste de mots, lue une fois, du plus précis au plus large.
 */
const RULES: Rule[] = [
  { words: ['café', 'petit dej', 'petit-déj', 'brunch'], emoji: '☕️', color: 'peach' },
  { words: ['déjeuner', 'dejeuner', 'dîner', 'diner', 'resto', 'restaurant', 'repas', 'manger', 'midi'], emoji: '🍽️', color: 'peach' },
  { words: ['apéro', 'apero', 'verre', 'soirée', 'soiree', 'fête', 'fete', 'anniv'], emoji: '🥂', color: 'lilac' },
  { words: ['anniversaire'], emoji: '🎂', color: 'butter' },
  { words: ['sport', 'gym', 'muscu', 'course', 'courir', 'running', 'vélo', 'velo', 'piscine', 'natation', 'tennis', 'foot'], emoji: '🏃‍♀️', color: 'mint' },
  { words: ['yoga', 'pilates', 'méditation', 'meditation', 'stretching'], emoji: '🧘‍♀️', color: 'mint' },
  { words: ['réunion', 'reunion', 'meeting', 'point', 'visio', 'call', 'brief', 'entretien', 'boulot', 'travail', 'bureau'], emoji: '💼', color: 'sky' },
  { words: ['appel', 'téléphone', 'telephone'], emoji: '📞', color: 'sky' },
  { words: ['médecin', 'medecin', 'docteur', 'dentiste', 'kiné', 'kine', 'ostéo', 'osteo', 'gyneco', 'gynéco', 'analyse', 'vaccin', 'santé', 'sante'], emoji: '🩺', color: 'sage' },
  { words: ['ciné', 'cine', 'film', 'théâtre', 'theatre', 'concert', 'expo', 'musée', 'musee', 'spectacle'], emoji: '🎬', color: 'lilac' },
  { words: ['train', 'avion', 'vol', 'gare', 'aéroport', 'aeroport', 'voyage', 'vacances', 'départ', 'depart'], emoji: '✈️', color: 'butter' },
  { words: ['courses', 'shopping', 'marché', 'marche', 'supermarché'], emoji: '🛍️', color: 'blush' },
  { words: ['cours', 'école', 'ecole', 'fac', 'révision', 'revision', 'exam', 'devoir', 'lecture', 'livre'], emoji: '📚', color: 'lavender' },
  { words: ['ménage', 'menage', 'lessive', 'rangement', 'vaisselle', 'tri'], emoji: '🧺', color: 'stone' },
  { words: ['chien', 'chat', 'véto', 'veto', 'balade'], emoji: '🐾', color: 'sage' },
  { words: ['coiffeur', 'ongles', 'manucure', 'massage', 'institut', 'esthé'], emoji: '💅', color: 'blush' },
  { words: ['voiture', 'garage', 'révision auto', 'contrôle technique'], emoji: '🚗', color: 'stone' },
  { words: ['maison', 'déménagement', 'demenagement', 'travaux', 'plombier'], emoji: '🏡', color: 'sage' },
  { words: ['musique', 'guitare', 'piano', 'podcast'], emoji: '🎧', color: 'lavender' },
  { words: ['dessin', 'peinture', 'atelier', 'photo'], emoji: '🎨', color: 'lilac' },
  { words: ['dodo', 'sieste', 'coucher', 'nuit'], emoji: '🌙', color: 'lavender' },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const NORMALIZED = RULES.map((r) => ({ ...r, words: r.words.map(normalize) }));

export type Suggestion = { emoji: string; color: ColorKey };

/** Renvoie une proposition, ou null si le titre n'évoque rien de connu. */
export function suggestFromTitle(title: string): Suggestion | null {
  const text = normalize(title.trim());
  if (text.length < 3) return null;
  for (const rule of NORMALIZED) {
    for (const w of rule.words) {
      if (text.includes(w)) return { emoji: rule.emoji, color: rule.color };
    }
  }
  return null;
}
