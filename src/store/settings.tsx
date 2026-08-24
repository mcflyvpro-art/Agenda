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
import { PALETTES } from '../palettes';
import type { ColorKey, Swatch } from '../theme';

const STORAGE_KEY = 'agenda.settings.v2';

/** L'échelle de temps affichée — c'est elle qui change vraiment la disposition. */
export type Scale = 'year' | 'month' | 'week' | 'day' | 'list';
/** Ce que raconte une case du mois. */
export type MonthCells = 'dots' | 'tint' | 'bars' | 'titles' | 'heat';
/** Ce qui occupe le bas de l'écran sous la grille du mois. */
export type MonthPanel = 'none' | 'day';
export type WeekLayout = 'grid7' | 'grid3' | 'list';
export type DayLayout = 'timeline' | 'rail' | 'list';
export type DayRange = 'full' | 'active' | 'auto';
export type Density = 'compact' | 'normal' | 'roomy';
export type Detail = 'minimal' | 'normal' | 'full';

export type Settings = {
  scale: Scale;
  monthCells: MonthCells;
  monthPanel: MonthPanel;
  weekLayout: WeekLayout;
  dayLayout: DayLayout;
  dayRange: DayRange;
  density: Density;
  detail: Detail;
  autoColor: boolean;
  showEmoji: boolean;
  showNowLine: boolean;
  dimWeekend: boolean;
  showWeekNumbers: boolean;
  hideDone: boolean;
  weekStart: 0 | 1;
};

export const DEFAULTS: Settings = {
  scale: 'month',
  monthCells: 'tint',
  monthPanel: 'day',
  weekLayout: 'grid7',
  dayLayout: 'timeline',
  dayRange: 'full',
  density: 'normal',
  detail: 'normal',
  autoColor: true,
  showEmoji: true,
  showNowLine: true,
  dimWeekend: false,
  showWeekNumbers: false,
  hideDone: false,
  weekStart: 1,
};

/** Hauteur d'une heure dans les grilles horaires. */
export const HOUR_HEIGHT: Record<Density, number> = {
  compact: 46,
  normal: 70,
  roomy: 98,
};

/** Hauteur de base d'une case du mois, avant ajustement à l'écran. */
export const CELL_HEIGHT: Record<MonthCells, number> = {
  dots: 54,
  tint: 58,
  bars: 56,
  titles: 82,
  heat: 50,
};

export const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.86,
  normal: 1,
  roomy: 1.16,
};

/** Les couleurs d'interface qui suivent le jeu de couleurs choisi. */
export type UiColors = {
  accent: string;
  today: string;
  gradient: readonly [string, string, string];
};

type Store = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  swatch: (key: ColorKey) => Swatch;
  ui: UiColors;
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
          const merged = { ...DEFAULTS, ...parsed };
          // un réglage retiré depuis (l'ancien panneau « À venir ») ne doit pas
          // survivre dans les préférences déjà enregistrées
          if (merged.monthPanel !== 'day' && merged.monthPanel !== 'none') {
            merged.monthPanel = DEFAULTS.monthPanel;
          }
          setSettings(merged);
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

  const reset = useCallback(
    () => setSettings((prev) => ({ ...DEFAULTS, scale: prev.scale })),
    [],
  );

  // Un seul habillage, assumé : Sorbet.
  const palette = PALETTES.sorbet;

  const swatch = useCallback((key: ColorKey) => palette.colors[key] ?? palette.colors.lavender, [
    palette,
  ]);

  const ui = useMemo<UiColors>(
    () => ({ accent: palette.accent, today: palette.today, gradient: palette.gradient }),
    [palette],
  );

  const value = useMemo<Store>(
    () => ({ settings, update, reset, swatch, ui }),
    [settings, update, reset, swatch, ui],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Store {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>');
  return ctx;
}

export function useSwatch() {
  return useSettings().swatch;
}
