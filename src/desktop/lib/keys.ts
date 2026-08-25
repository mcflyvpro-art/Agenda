import { useEffect, useRef } from 'react';

/** Vrai si la frappe part d'un champ de saisie : les raccourcis s'effacent. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
}

/** Décrit une touche telle qu'on l'écrit dans une table de raccourcis. */
export type Combo = {
  key: string;
  /** ⌘ sur Mac, Ctrl ailleurs — les deux sont acceptés */
  meta?: boolean;
  shift?: boolean;
  /** autoriser le raccourci même en pleine saisie (Échap, ⌘↵…) */
  whileTyping?: boolean;
};

export type Binding = Combo & { run: () => void };

/**
 * Les raccourcis clavier de l'interface bureau.
 *
 * Un seul écouteur pour toute l'application, posé sur le document : c'est
 * la seule façon d'attraper une touche où que soit le focus, et ça évite
 * d'avoir à rendre focusable chaque zone qui voudrait réagir. La table est
 * relue à chaque frappe depuis une référence, pour que les fermetures des
 * actions restent fraîches sans réabonner l'écouteur à chaque rendu.
 */
export function useKeyboard(bindings: Binding[], enabled = true) {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      for (const b of ref.current) {
        if (typing && !b.whileTyping) continue;
        if (b.key !== key) continue;
        if (!!b.meta !== meta) continue;
        if (!!b.shift !== e.shiftKey) continue;
        e.preventDefault();
        b.run();
        return;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** '⌘K' / 'Ctrl K' selon la machine, pour l'afficher à côté d'une action. */
export function comboLabel(c: Combo): string {
  const mac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
  const parts: string[] = [];
  if (c.meta) parts.push(mac ? '⌘' : 'Ctrl');
  if (c.shift) parts.push(mac ? '⇧' : 'Maj');
  const named: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Enter: '↵',
    Escape: 'Échap',
    Backspace: '⌫',
    ' ': 'Espace',
  };
  parts.push(named[c.key] ?? c.key.toUpperCase());
  return parts.join(mac ? '' : ' ');
}
