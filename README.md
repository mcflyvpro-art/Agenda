# Agenda 🌸

Un agenda mobile pensé pour une seule personne : doux, pastel, très visuel.
Inspiration : **Structured** pour la timeline, **Monday.com** pour l'épure et les couleurs,
et les codes d'iOS pour les gestes et les animations.

Une seule base de code, deux plateformes : **iOS** (l'utilisatrice) et **Android** (pour tester).

---

## Ce que fait l'app

**Vue Mois**
- Grille pastel, swipe horizontal fluide entre les mois (ou les flèches).
- Les jours qui ont des événements prennent la teinte de leur premier événement + pastilles colorées.
- Le jour sélectionné s'entoure d'une bulle animée ; aujourd'hui est toujours en rose.
- Sous le calendrier : la liste du jour sélectionné, en cartes colorées.

**Vue Jour**
- Bandeau de semaine en haut (tap pour changer de jour, swipe pour glisser d'un jour à l'autre).
- Timeline 24 h, les événements placés à l'heure exacte ; les chevauchements se rangent côte à côte.
- Ligne « maintenant » rose, mise à jour toute seule, et ouverture automatique sur l'heure courante.
- Tap sur un créneau vide → création d'un événement pile à cette heure-là.
- Appui long sur un événement → coché / décoché.

**Créer un événement (volontairement permissif)**
- Titre libre, emoji (24 au choix), 9 couleurs pastel.
- Date via un mini-calendrier qui se déplie dans la fiche.
- Heures de début et de fin via des roulettes façon iOS (pas de 5 min).
- Bascule « toute la journée », lieu, notes.
- Suppression depuis la fiche, cases à cocher sur les cartes.

**Le reste**
- Tout est stocké **en local sur le téléphone** (aucun compte, aucun serveur, aucune donnée qui sort).
- Retours haptiques sur chaque interaction, animations ressort, dégradé de fond, blur.
- Interface entièrement en français.

---

## Tester sans rien installer

Le plus simple, depuis un téléphone : **ouvrir la version web**. C'est la même app,
le même code, le même rendu — juste sans les vibrations (le web ne les propose pas).
Les événements sont gardés dans le navigateur, donc on peut vraiment s'en servir.

Deux chemins :

1. **L'aperçu publié** — le lien partagé dans la conversation. Rien à faire, ça s'ouvre.
2. **GitHub Pages**, pour une URL permanente qui se met à jour à chaque push :
   dans le repo, *Settings → Pages → Source : **GitHub Actions***.
   Le workflow `.github/workflows/web.yml` fait le reste, et le site sort sur
   `https://<compte>.github.io/<repo>/`.

Dans les deux cas, « Ajouter à l'écran d'accueil » depuis le navigateur donne une
icône et un affichage plein écran, comme une vraie app.

## Lancer l'app en développement

```bash
npm install
npx expo start
```

Puis :

- **Android** : installe *Expo Go* depuis le Play Store, ouvre-le et scanne le QR code affiché dans le terminal.
- **iOS** : installe *Expo Go* depuis l'App Store et scanne le QR code avec l'appareil photo.
  (Le téléphone et l'ordinateur doivent être sur le même réseau Wi-Fi ; sinon `npx expo start --tunnel`.)
- **Navigateur** : `npx expo start --web`.

Pour installer l'app « pour de vrai » sur l'iPhone (sans passer par l'App Store, sans Mac) :

```bash
npx eas build --platform ios --profile preview
```

## Structure

```
App.tsx                     fond dégradé + providers
app.config.js               préfixe des chemins pour le build web
src/
  theme.ts                  palette pastel (wash / solid / deep), rayons, ombres, emojis
  types.ts                  AgendaEvent, Draft
  store/events.tsx          état global + persistance AsyncStorage
  lib/
    date.ts                 helpers de dates en français
    layout.ts               répartition des événements qui se chevauchent
    haptics.ts              retours haptiques
    id.ts
  screens/CalendarScreen.tsx  l'écran unique : en-tête, bascule Mois/Jour, pager, fiche
  components/
    MonthGrid.tsx           la grille du mois (aussi utilisée en version compacte dans la fiche)
    DayTimeline.tsx         la timeline horaire
    WeekStrip.tsx           le bandeau de semaine
    EventCard.tsx           la carte d'événement de la liste
    EventSheet.tsx          la fiche de création / édition
    Wheel.tsx / TimeWheel.tsx  les roulettes d'heure
    Pager.tsx               pager horizontal générique
    ModeSwitch.tsx, Toggle.tsx, Squish.tsx, AddButton.tsx, EmptyDay.tsx
```

## Petits réglages

- **Événements d'exemple** au premier lancement : `SEED_ON_FIRST_LAUNCH` dans `src/store/events.tsx`.
- **Couleurs** : tout part de `PALETTE` dans `src/theme.ts`.
- **Hauteur d'une heure** dans la vue Jour : `HOUR_H` dans `src/components/DayTimeline.tsx`.
