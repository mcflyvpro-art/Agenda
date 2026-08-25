import { useEffect, useRef } from 'react';

/**
 * Les gestes du trackpad, tels que le navigateur les raconte.
 *
 * Un glissement à deux doigts sur un trackpad Mac n'est pas un « drag » :
 * le système le traduit en roulette. Le navigateur envoie une rafale
 * d'événements `wheel` pendant que les doigts bougent, puis continue tout
 * seul pendant l'inertie, en decrescendo, parfois une demi-seconde après
 * que la main a quitté la surface. Trois conséquences, dont tout ce
 * fichier découle :
 *
 *  — on ne peut pas se fier à un seul événement : il faut cumuler la course ;
 *  — on ne peut pas se fier à la fin du geste : il n'y en a pas. On la
 *    devine à un silence (plus rien pendant ~140 ms) ;
 *  — l'inertie franchirait le seuil dix fois de suite. Une fois le geste
 *    validé, on se désarme jusqu'au silence suivant.
 *
 * Et un piège : sur macOS, un balayage horizontal à deux doigts dans une
 * page web déclenche le retour arrière de l'historique. Il faut donc
 * `preventDefault()` dès qu'on reconnaît un geste horizontal — sinon
 * changer de semaine ferait quitter l'application.
 */

/** Course cumulée, en pixels, avant qu'un balayage ne change de page. */
const NAV_THRESHOLD = 80;
/** Un geste horizontal doit être franchement plus horizontal que vertical. */
const AXIS_BIAS = 1.2;
/** Silence à partir duquel on considère que les doigts ont quitté le trackpad. */
const QUIET_MS = 140;
/** Amplitude du léger décalage qui suit les doigts, en pixels. */
const NUDGE_MAX = 46;
/** Course cumulée d'un pincement avant de changer d'échelle. */
const ZOOM_THRESHOLD = 42;

type NavOptions = {
  onPrev: () => void;
  onNext: () => void;
  /** l'élément qu'on décale légèrement pendant le geste, pour qu'il réponde */
  nudgeRef?: React.RefObject<any>;
  enabled?: boolean;
};

/**
 * Balayage à deux doigts pour changer de période.
 *
 * Pendant le geste le contenu suit un peu la main — amorti, borné, jamais
 * plus loin que quelques dizaines de pixels : assez pour que le geste ait
 * une réponse, pas assez pour faire croire qu'on fait défiler la page. Ce
 * décalage est écrit directement dans le style du nœud plutôt que passé
 * par un état React : à soixante événements par seconde, un rendu complet
 * à chaque cran de roulette hacherait l'animation.
 */
export function useWheelNav(
  hostRef: React.RefObject<any>,
  { onPrev, onNext, nudgeRef, enabled = true }: NavOptions,
) {
  const prevRef = useRef(onPrev);
  const nextRef = useRef(onNext);
  prevRef.current = onPrev;
  nextRef.current = onNext;

  useEffect(() => {
    const node: HTMLElement | null = hostRef.current as any;
    if (!node || !enabled || typeof window === 'undefined') return;

    let acc = 0;
    let armed = true;
    let quiet: ReturnType<typeof setTimeout> | undefined;

    const nudge = (px: number, settle: boolean) => {
      const el: HTMLElement | null = (nudgeRef?.current as any) ?? null;
      if (!el) return;
      el.style.transition = settle ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
      el.style.transform = `translate3d(${px}px, 0, 0)`;
    };

    const rest = () => {
      acc = 0;
      armed = true;
      nudge(0, true);
    };

    const onWheel = (e: WheelEvent) => {
      // un pincement arrive aussi en `wheel`, mais avec ctrlKey : ce n'est pas
      // une navigation, c'est le zoom — géré ailleurs
      if (e.ctrlKey) return;

      const dx = e.deltaX;
      const dy = e.deltaY;

      // geste vertical : c'est du défilement ordinaire, on ne s'en mêle pas
      if (Math.abs(dx) <= Math.abs(dy) * AXIS_BIAS) {
        if (acc !== 0) rest();
        return;
      }

      // à partir d'ici le geste est à nous, et surtout : pas au navigateur,
      // qui y verrait un retour arrière dans l'historique
      e.preventDefault();

      clearTimeout(quiet);
      quiet = setTimeout(rest, QUIET_MS);

      // l'inertie continue de pousser après la validation : on l'ignore
      if (!armed) return;

      acc += dx;

      if (acc > NAV_THRESHOLD) {
        armed = false;
        acc = 0;
        nudge(0, true);
        nextRef.current();
      } else if (acc < -NAV_THRESHOLD) {
        armed = false;
        acc = 0;
        nudge(0, true);
        prevRef.current();
      } else {
        // amorti : la réponse s'écrase à mesure qu'on approche du seuil
        const ratio = acc / NAV_THRESHOLD;
        nudge(-Math.sign(ratio) * NUDGE_MAX * Math.abs(ratio) ** 0.8, false);
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      clearTimeout(quiet);
      nudge(0, true);
    };
  }, [hostRef, nudgeRef, enabled]);
}

type ZoomOptions = {
  /** pincement écarté : on entre dans le détail (année → mois → semaine → jour) */
  onZoomIn: () => void;
  /** pincement resserré : on prend du recul */
  onZoomOut: () => void;
  enabled?: boolean;
};

/**
 * Pincement à deux doigts pour changer d'échelle.
 *
 * macOS traduit le pincement en `wheel` avec `ctrlKey` levé — la même
 * convention que le zoom navigateur, qu'on intercepte donc au passage
 * pour lui donner un sens propre à un calendrier : resserrer prend du
 * recul (jour → semaine → mois → année), écarter entre dans le détail.
 */
export function useWheelZoom(
  hostRef: React.RefObject<any>,
  { onZoomIn, onZoomOut, enabled = true }: ZoomOptions,
) {
  const inRef = useRef(onZoomIn);
  const outRef = useRef(onZoomOut);
  inRef.current = onZoomIn;
  outRef.current = onZoomOut;

  useEffect(() => {
    const node: HTMLElement | null = hostRef.current as any;
    if (!node || !enabled || typeof window === 'undefined') return;

    let acc = 0;
    let armed = true;
    let quiet: ReturnType<typeof setTimeout> | undefined;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      // sans ça, c'est toute la page que le navigateur agrandit
      e.preventDefault();

      clearTimeout(quiet);
      quiet = setTimeout(() => {
        acc = 0;
        armed = true;
      }, QUIET_MS);

      if (!armed) return;
      acc += e.deltaY;

      // deltaY négatif = doigts qui s'écartent = on entre dans le détail
      if (acc < -ZOOM_THRESHOLD) {
        armed = false;
        acc = 0;
        inRef.current();
      } else if (acc > ZOOM_THRESHOLD) {
        armed = false;
        acc = 0;
        outRef.current();
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      clearTimeout(quiet);
    };
  }, [hostRef, enabled]);
}
