import { Platform, StyleProp, ViewStyle } from 'react-native';

/**
 * Sur le web, le navigateur confisque le geste dès qu'il touche une zone
 * qui défile : au deuxième mouvement du doigt il émet `pointercancel` et
 * garde la main. Un balayage horizontal posé sur une timeline ou une liste
 * n'atteint donc jamais le code — c'est ce qui empêchait de changer de jour
 * en glissant sur le corps de l'écran.
 *
 * `touch-action: pan-y` sur le conteneur qui défile lève exactement ce
 * malentendu : le défilement vertical reste natif (donc fluide), et le
 * mouvement horizontal est rendu à l'application. À poser sur tout scroll
 * vertical vivant à l'intérieur d'un Pager.
 *
 * Sans effet ailleurs que sur le web, où la propriété n'existe pas.
 */
export const SCROLL_IN_PAGER: StyleProp<ViewStyle> =
  Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as ViewStyle) : null;
