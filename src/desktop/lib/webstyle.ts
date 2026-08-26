import { MOTION } from '../theme';

/**
 * Ce que React Native ne sait pas dire, et qu'un bureau réclame.
 *
 * Trois familles de finitions n'ont aucun équivalent dans le modèle de
 * style de React Native, et sont pourtant exactement ce qui sépare une
 * page web d'une application de bureau :
 *
 *  — les pseudo-éléments : barres de défilement, texte sélectionné,
 *    texte de substitution des champs. On ne peut pas les atteindre
 *    depuis un objet de style, il faut de vraies règles CSS ;
 *  — `:focus-visible` : l'anneau de mise au point ne doit apparaître
 *    qu'au clavier, jamais au clic. Le navigateur seul sait faire la
 *    différence ;
 *  — les transitions et les images-clés : les jouer depuis JavaScript
 *    demanderait un rendu React par image, là où le compositeur du
 *    navigateur les anime sans jamais toucher au fil principal.
 *
 * D'où cette feuille, posée une fois dans l'entête au premier import.
 * Tout y est enfermé sous `[data-dk-root]`, l'attribut que porte la
 * racine de l'interface bureau : l'interface mobile, qui ne le porte
 * pas, n'en reçoit pas une seule règle.
 *
 * Une chose n'y est délibérément pas : la police. React Native Web rend
 * déjà chaque texte dans la pile système (`-apple-system` en tête), donc
 * SF Pro sur un Mac et Segoe UI sur Windows — il n'y a rien à gagner à
 * la réécrire, et beaucoup à perdre : une règle assez large pour
 * atteindre tous les textes atteindrait aussi les icônes, qui sont
 * elles-mêmes une police et se changeraient en charabia.
 */

const STYLE_ID = 'agenda-desktop-style';

/** La couleur d'accent suit le jeu de couleurs : elle passe par une variable. */
export const ACCENT_VAR = '--dk-accent';

/** Teinte de repli, utilisée tant que la variable n'est pas encore posée. */
const FALLBACK = '#9D8AEA';

const CSS = `
[data-dk-root] {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-synthesis-weight: none;
}

/* Le texte sélectionné prend la couleur du jeu choisi. */
[data-dk-root] ::selection {
  background: rgba(157,138,234,0.26);
  background: color-mix(in srgb, var(${ACCENT_VAR}, ${FALLBACK}) 26%, transparent);
}

/*
  Les champs de saisie.

  Le halo bleu du navigateur est retiré partout dans l'application au
  profit d'un anneau à la couleur du jeu — mais seulement au clavier :
  « focus-visible » laisse le clic tranquille, ce qu'un « focus » nu ne
  sait pas faire.
*/
[data-dk-root] input,
[data-dk-root] textarea {
  caret-color: ${FALLBACK};
  caret-color: var(${ACCENT_VAR}, ${FALLBACK});
  transition: box-shadow ${MOTION.base} ${MOTION.out}, background-color ${MOTION.base} ${MOTION.out};
}
[data-dk-root] input:focus-visible,
[data-dk-root] textarea:focus-visible,
[data-dk-root] [data-dk]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(157,138,234,0.5);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(${ACCENT_VAR}, ${FALLBACK}) 50%, transparent);
}
[data-dk-root] input::placeholder,
[data-dk-root] textarea::placeholder { opacity: 1; }
/*
  Sauf pour un champ qui est seul à pouvoir recevoir le focus de sa
  couche — celui de la palette. L'anneau n'y désigne rien : il n'y a
  aucun autre endroit d'où le curseur de saisie pourrait venir.
*/
[data-dk-root] [data-dk="bare"]:focus-visible { box-shadow: none; }

/*
  Barres de défilement.

  Fines, sans piste, et effacées tant que le curseur n'est pas entré dans
  la zone : c'est la convention de macOS, et sur un calendrier elle
  compte double — une barre permanente mangerait la colonne du jour la
  plus à droite.
*/
[data-dk-root] * { scrollbar-width: thin; scrollbar-color: rgba(60,52,88,0.24) transparent; }
[data-dk-root] ::-webkit-scrollbar { width: 11px; height: 11px; }
[data-dk-root] ::-webkit-scrollbar-track { background: transparent; }
[data-dk-root] ::-webkit-scrollbar-corner { background: transparent; }
[data-dk-root] ::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: content-box;
  transition: background-color ${MOTION.base} ${MOTION.out};
}
[data-dk-root] *:hover::-webkit-scrollbar-thumb { background-color: rgba(60,52,88,0.22); }
[data-dk-root] ::-webkit-scrollbar-thumb:hover { background-color: rgba(60,52,88,0.4); }

/*
  Les états au curseur, confiés au compositeur.

  Chaque brique cliquable porte « data-dk » ; la transition vit donc ici,
  une fois pour toutes, plutôt que recopiée dans chaque feuille de style
  de composant. Le changement de fond, le décollement au survol et
  l'écrasement à l'appui sont alors interpolés par le navigateur, sans
  qu'un seul rendu React soit demandé entre les deux états.
*/
[data-dk] {
  transition:
    background-color ${MOTION.fast} ${MOTION.out},
    box-shadow ${MOTION.base} ${MOTION.out},
    transform ${MOTION.fast} ${MOTION.out},
    opacity ${MOTION.fast} ${MOTION.out},
    border-color ${MOTION.fast} ${MOTION.out},
    color ${MOTION.fast} ${MOTION.out};
}
/* Les surfaces qui portent du contenu bougent un cran plus lentement. */
[data-dk="card"], [data-dk="event"] {
  transition:
    background-color ${MOTION.base} ${MOTION.out},
    box-shadow ${MOTION.base} ${MOTION.out},
    transform ${MOTION.base} ${MOTION.out},
    opacity ${MOTION.base} ${MOTION.out},
    border-color ${MOTION.base} ${MOTION.out};
}
/* Ce qui suit le curseur au pixel près ne doit surtout pas être amorti. */
[data-dk="live"] { transition: none; }

/*
  Apparitions.

  Une vue qui change ne doit pas clignoter : elle monte de quelques
  pixels en se révélant, ce qui donne au regard une direction à suivre.
  Les panneaux modaux, eux, arrivent avec un très léger dépassement —
  la seule élasticité que s'autorise l'application.
*/
@keyframes dk-rise {
  from { opacity: 0; transform: translate3d(0, 7px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes dk-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dk-pop {
  from { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.975); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes dk-slide {
  from { opacity: 0; transform: translate3d(12px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
/* Le battement de l'heure courante : lent, à peine perceptible. */
@keyframes dk-beat {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.55); opacity: 0.3; }
}

[data-dk-anim="rise"]  { animation: dk-rise ${MOTION.slow} ${MOTION.out} both; }
[data-dk-anim="fade"]  { animation: dk-fade ${MOTION.base} ${MOTION.out} both; }
[data-dk-anim="pop"]   { animation: dk-pop 260ms ${MOTION.spring} both; }
[data-dk-anim="slide"] { animation: dk-slide ${MOTION.slow} ${MOTION.out} both; }
[data-dk-anim="beat"]  { animation: dk-beat 2.6s ease-in-out infinite; }

/*
  Le réglage système « réduire les animations » est un vrai réglage
  d'accessibilité, pas une préférence esthétique : on le respecte
  entièrement plutôt que de l'atténuer.
*/
@media (prefers-reduced-motion: reduce) {
  [data-dk-root] *,
  [data-dk-root] *::before,
  [data-dk-root] *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
`;

let injected = false;

/** Pose la feuille dans l'entête, une seule fois, côté navigateur. */
export function installDesktopStyle() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

/** Publie la couleur d'accent pour les règles qui en dépendent. */
export function setAccentVar(accent: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(ACCENT_VAR, accent);
}
