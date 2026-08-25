import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'agenda.desktop.v1';

/** La section de gauche : ce que la zone centrale montre. */
export type Section = 'dashboard' | 'calendar' | 'ideas';
/** L'échelle du calendrier, propre au bureau — plus large que sur mobile. */
export type DeskScale = 'year' | 'month' | 'week' | 'day' | 'list';

export type DeskPrefs = {
  section: Section;
  scale: DeskScale;
  /** le panneau de droite, qu'on peut replier pour gagner de la largeur */
  inspector: boolean;
  sidebar: boolean;
  /** hauteur d'une heure, en pixels — le « zoom » des grilles horaires */
  hourHeight: number;
  showWeekends: boolean;
  showWeekNumbers: boolean;
  showDone: boolean;
};

export const DESK_DEFAULTS: DeskPrefs = {
  section: 'dashboard',
  scale: 'week',
  inspector: true,
  sidebar: true,
  hourHeight: 52,
  showWeekends: true,
  showWeekNumbers: true,
  showDone: true,
};

export const HOUR_MIN = 30;
export const HOUR_MAX = 132;

type Store = {
  prefs: DeskPrefs;
  update: (patch: Partial<DeskPrefs>) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

/**
 * Les préférences de l'interface bureau, séparées de celles du mobile.
 *
 * Elles pourraient partager le même magasin, mais les deux interfaces ne
 * veulent pas les mêmes choses : « densité » n'a pas de sens ici, où l'on
 * règle directement la hauteur d'une heure à la molette, et « échelle »
 * doit pouvoir différer d'un appareil à l'autre — on ne regarde pas son
 * agenda de la même façon sur un téléphone et sur un grand écran. Deux
 * clés de stockage distinctes, donc, et aucun risque qu'un réglage pris
 * ici change quoi que ce soit là-bas.
 */
export function DeskPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<DeskPrefs>(DESK_DEFAULTS);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<DeskPrefs>;
          setPrefs({ ...DESK_DEFAULTS, ...parsed });
        }
      } catch {
        // réglages illisibles : on garde les valeurs par défaut
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs]);

  const update = useCallback((patch: Partial<DeskPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setPrefs(DESK_DEFAULTS), []);

  const value = useMemo<Store>(() => ({ prefs, update, reset }), [prefs, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDeskPrefs(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDeskPrefs doit être utilisé dans <DeskPrefsProvider>');
  return ctx;
}
