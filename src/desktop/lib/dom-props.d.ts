/**
 * La propriété que React Native Web transmet au DOM et que React Native
 * ne connaît pas.
 *
 * `dataSet` devient des attributs `data-*` sur l'élément : c'est par là
 * que la feuille de style du bureau accroche ses transitions et ses
 * apparitions. La déclarer ici évite de parsemer l'interface bureau de
 * dérogations au vérificateur de types, qui masqueraient au passage de
 * vraies erreurs sur les lignes voisines.
 *
 * L'infobulle, elle, ne passe pas par les propriétés : `title` ne fait
 * pas partie des attributs que React Native Web laisse passer, et c'est
 * `Press` qui l'écrit sur le nœud une fois monté.
 */
declare module 'react-native' {
  interface ViewProps {
    dataSet?: Record<string, string | number | undefined>;
  }
}

export {};
