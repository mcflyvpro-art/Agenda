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
 *
 * L'écoute se fait à la descente — `capture` — et pas à la remontée, pour
 * une raison qui n'a rien de théorique : le champ de saisie de React
 * Native Web arrête la propagation de toutes les touches qu'il reçoit.
 * À la remontée, l'écouteur ne voit donc jamais rien de ce qui est frappé
 * dans un champ, et les trois raccourcis explicitement marqués
 * `whileTyping` — Échap, ⌘↵, ⌘K — sont précisément ceux qui doivent
 * marcher là : fermer la fiche qu'on remplit, l'enregistrer, ouvrir la
 * recherche sans lâcher le clavier. À la descente, la touche est vue
 * avant que le champ ne l'intercepte, et ceux qui ne s'appliquent pas en
 * pleine saisie continuent d'être écartés comme avant.
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

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
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
