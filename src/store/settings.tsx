import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { tonedPalette, type ColorKey, type Swatch, type Tone } from '../theme';

const STORAGE_KEY = 'agenda.settings.v1';

/** Comment les jours du mois sont rendus dans la grille. */
export type MonthLayout = 'minimal' | 'dots' | 'tint' | 'bars' | 'preview' | 'heat';
/** Ce qui occupe le bas de l'écran en vue Mois. */
export type MonthPanel = 'day' | 'agenda' | 'none';
/** Comment une journée est rendue. */
export type DayLayout = 'timeline' | 'rail' | 'list' | 'three';
/** Quelle tranche horaire est affichée. */
export type DayRange = 'full' | 'active' | 'auto';
export type Density = 'compact' | 'normal' | 'roomy';
export type Detail = 'minimal' | 'normal' | 'full';

export type Settings = {
  monthLayout: MonthLayout;
  monthPanel: MonthPanel;
  dayLayout: DayLayout;
  dayRange: DayRange;
  density: Density;
  detail: Detail;
  tone: Tone;
  showEmoji: boolean;
  showNowLine: boolean;
  dimWeekend: boolean;
  weekStart: 0 | 1;
  showWeekNumbers: boolean;
  hideDone: boolean;
};

export const DEFAULTS: Settings = {
  monthLayout: 'tint',
  monthPanel: 'day',
  dayLayout: 'timeline',
  dayRange: 'full',
  density: 'normal',
  detail: 'normal',
  tone: 'pastel',
  showEmoji: true,
  showNowLine: true,
  dimWeekend: false,
  weekStart: 1,
  showWeekNumbers: false,
  hideDone: false,
};

/** Hauteur d'une heure dans la timeline, selon la densité. */
export const HOUR_HEIGHT: Record<Density, number> = {
  compact: 46,
  normal: 70,
  roomy: 98,
};

/** Hauteur d'une case du mois, selon la disposition puis la densité. */
export const CELL_HEIGHT: Record<MonthLayout, number> = {
  minimal: 46,
  dots: 54,
  tint: 58,
  bars: 56,
  preview: 82,
  heat: 50,
};

export const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.86,
  normal: 1,
  roomy: 1.16,
};

type Store = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  swatch: (key: ColorKey) => Swatch;
};

const SettingsContext = createContext<Store | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          // on repart des valeurs par défaut : un réglage ajouté plus tard reste valide
          setSettings({ ...DEFAULTS, ...parsed });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const palette = useMemo(() => tonedPalette(settings.tone), [settings.tone]);
  const swatch = useCallback(
    (key: ColorKey) => palette[key] ?? palette.lavender,
    [palette],
  );

  const value = useMemo<Store>(
    () => ({ settings, update, reset, swatch }),
    [settings, update, reset, swatch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Store {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>');
  return ctx;
}

/** Raccourci pour les composants qui n'ont besoin que des couleurs. */
export function useSwatch() {
  return useSettings().swatch;
}
