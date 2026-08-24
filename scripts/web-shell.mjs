/**
 * Ce qui fait qu'une page web se comporte comme une application.
 *
 * Un navigateur mobile laisse par défaut pincer pour zoomer, taper deux
 * fois pour agrandir, et tirer la page au-delà de ses bords. Dans une
 * interface plein écran, chacun de ces gestes casse la mise en page : le
 * contenu sort de l'écran et n'y revient pas. On les coupe tous les trois,
 * à trois endroits, parce qu'aucun ne suffit seul :
 *
 *   - la balise viewport, respectée en mode application installée ;
 *   - `touch-action` et `overscroll-behavior`, qui règlent le débordement ;
 *   - les événements `gesture*` de Safari, seul moyen d'y bloquer le
 *     pincement quand la page tourne dans l'onglet plutôt qu'installée.
 *
 * Partagé par les deux constructions : la version hébergée et le fichier
 * autonome.
 */

export const VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';

export const RESET_CSS = `
  html, body {
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  body {
    position: fixed;
    inset: 0;
    margin: 0;
    background: #FBEFEA;
    touch-action: pan-x pan-y;
    -webkit-tap-highlight-color: transparent;
  }
  * { -webkit-tap-highlight-color: transparent; }
  #root { display: flex; height: 100%; flex: 1; }
`;

/** À insérer tel quel dans un bloc de script. */
export const LOCK_JS = `
(function () {
  var vp = document.querySelector('meta[name="viewport"]');
  if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); document.head.appendChild(vp); }
  vp.setAttribute('content', ${JSON.stringify(VIEWPORT)});

  // Safari : le pincement passe par des événements propres au moteur, que
  // la balise viewport ne couvre pas quand la page tourne dans un onglet.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
  });

  // Un second doigt ne sert à rien ici : tout se fait à un doigt.
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
})();
`;
