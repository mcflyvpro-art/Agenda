import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

/** En deçà, même sur un ordinateur, l'interface bureau n'a plus la place de respirer. */
export const DESKTOP_MIN_WIDTH = 900;

/** Clé du choix manuel « bureau / mobile », quand on veut forcer l'un ou l'autre. */
const OVERRIDE_KEY = 'agenda.shell.override';

export type ShellChoice = 'auto' | 'desktop' | 'mobile';

function readOverride(): ShellChoice {
  if (!IS_WEB || typeof localStorage === 'undefined') return 'auto';
  try {
    const v = localStorage.getItem(OVERRIDE_KEY);
    return v === 'desktop' || v === 'mobile' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeOverride(choice: ShellChoice) {
  if (!IS_WEB || typeof localStorage === 'undefined') return;
  try {
    if (choice === 'auto') localStorage.removeItem(OVERRIDE_KEY);
    else localStorage.setItem(OVERRIDE_KEY, choice);
  } catch {
    /* stockage refusé : le choix ne survivra pas au rechargement, tant pis */
  }
}

/**
 * Un vrai pointeur — souris ou trackpad — par opposition à un doigt.
 *
 * C'est le seul signal fiable pour distinguer un ordinateur d'une tablette
 * large : la largeur seule classerait un iPad en paysage du mauvais côté,
 * alors que rien de ce que l'interface bureau propose (survol, clic droit,
 * raccourcis clavier, roulette) n'y fonctionne.
 */
function hasFinePointer(): boolean {
  if (!IS_WEB || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: fine)').matches;
}

/** Vrai quand il faut monter l'interface bureau plutôt que l'interface mobile. */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  const fine = useHasFinePointer();
  const [choice, setChoice] = useState<ShellChoice>(readOverride);

  useEffect(() => {
    if (!IS_WEB || typeof window === 'undefined') return;
    // un autre onglet peut avoir changé le choix manuel
    const onStorage = () => setChoice(readOverride());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!IS_WEB) return false;
  if (choice === 'mobile') return false;
  if (choice === 'desktop') return true;
  return fine && width >= DESKTOP_MIN_WIDTH;
}

/**
 * Un vrai pointeur, sans condition de largeur.
 *
 * Sert à l'échappatoire manuelle vers la version PC : une fenêtre de
 * navigateur peut être plus étroite que `DESKTOP_MIN_WIDTH` sans que la
 * personne devant soit pour autant sur un téléphone. Le pointeur, lui,
 * ne ment jamais — un doigt reste toujours grossier, souris et trackpad
 * toujours fins — donc un bouton basé dessus ne peut pas apparaître sur
 * un vrai iPhone/Android, seulement sur un ordinateur bloqué en petit.
 */
export function useHasFinePointer(): boolean {
  const [fine, setFine] = useState(hasFinePointer);
  useEffect(() => {
    if (!IS_WEB || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: fine)');
    const onChange = () => setFine(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return fine;
}
