# Agenda 🌸

Un agenda mobile pensé pour une seule personne : doux, pastel, très visuel.
Inspiration : **Structured** pour la timeline, **Monday.com** pour l'épure et les couleurs,
et les codes d'iOS pour les gestes et les animations.

Une seule base de code, deux plateformes : **iOS** (l'utilisatrice) et **Android** (pour tester).

---

## Ce que fait l'app

L'app tient en trois écrans, une barre en bas pour passer de l'un à l'autre.

### Accueil

Le premier écran répond à une seule question : **c'est quoi, aujourd'hui ?**

- La date, le nombre de moments, le temps occupé.
- La journée ramassée en **une barre** : où sont les blocs, où sont les trous,
  où en est-on. On la lit sans faire défiler, et chaque bloc s'ouvre au toucher.
- Le prochain moment mis en avant, avec le temps qui reste. Sinon, un gros **+**.
- Les cartes du jour, puis les trois idées en attente.

L'écran ne contient aucune phrase explicative : rien que des données, des icônes et
des couleurs.

### À faire — la boîte à idées

Un fourre-tout assumé. **Rien n'a d'identité dans la boîte** : pas de couleur, pas d'emoji,
juste ce qui est écrit. L'identité vient plus tard, au moment de placer l'idée dans le
calendrier — c'est là qu'elle devient un événement avec sa couleur et son emoji.

- Un champ tout en haut : on écrit, on valide au clavier, c'est rangé.
- Chaque idée porte une durée pressentie (15 min, 30 min, 1 h, 2 h).
- Les idées cochées descendent sous un trait, qu'on peut vider.

### Les gestes

L'app ne s'explique pas, elle se manipule.

| Où | Geste | Effet |
|---|---|---|
| Toute carte (idée ou événement) | glisser vers la **droite** | cocher / décocher |
| Toute carte | glisser vers la **gauche** | supprimer |
| Toute carte | **tap** | ouvrir la fiche |
| Idée | **double tap** | la placer dans le calendrier |
| Événement | **double tap** | cocher |
| Bouton **+** | tap | nouvel événement |
| Bouton **+** | **appui long** | nouvelle idée |
| Jour du mois, bandeau de semaine | tap | sélectionner |
| Jour du mois, bandeau de semaine | **appui long** | créer sur ce jour |
| Timeline, créneau vide | tap | créer à cette heure |
| Timeline, événement | appui long | cocher |
| Chronologie, trou | tap | créer dans ce trou |
| Barre du jour (accueil) | tap sur un bloc | ouvrir l'événement |
| Année | tap sur un mois | y entrer |
| Partout | glisser horizontalement | changer de page |
| Feuilles | glisser vers le bas | fermer |

### Agenda — cinq échelles de temps

C'est le vrai choix de disposition : chaque échelle est une lecture différente,
pas la même grille repeinte.

- **Année** — les douze mois d'un coup, façon Apple Calendar. Les jours occupés se teintent,
  aujourd'hui est marqué. On touche un mois pour y entrer.
- **Mois** — la grille classique, swipe entre les mois, et ce qu'on veut en dessous.
- **Semaine** — la vraie grille 7 colonnes × heures, avec la ligne de l'heure sur la bonne colonne.
- **Jour** — la journée en détail.
- **Liste** — le déroulé continu des jours à venir, regroupé par mois.

### Les variantes de chaque échelle

**Mois** — les cases : Pastilles · Teintes · Barres · Titres · Intensité (carte de chaleur).
En mode Titres, les semaines chargées prennent plus de hauteur que les semaines vides.
**Sous la grille** : le jour choisi · les jours à venir · rien (grille plein écran).

**Semaine** — 7 jours · 3 jours (plus lisible sur un téléphone) · Liste (jour par jour).

**Jour** — Timeline (la grille horaire) · Chronologie (les heures creuses repliées en
« 1 h 30 de libre », touchables pour y créer quelque chose) · Liste.

**Partout** — plage horaire (0–24 h, heures actives, ou calée automatiquement autour des
événements, et toujours élargie si un événement déborde), densité (compact / normal / aéré),
détail des cartes (titre seul → horaires → lieu et notes).

### Les couleurs

L'app porte un seul habillage, **Sorbet** : franc, joyeux, chaud. Il tient le fond, le
bouton +, la couleur d'aujourd'hui et les neuf teintes d'événements. Pas de sélecteur de
thème — c'est la couleur de la maison.

(`src/palettes.ts` en contient quatre autres, générées par la même recette : Pastel, Brume,
Terre, Encre. Changer de teinte de maison tient en une ligne dans `src/store/settings.tsx`.)

Chaque teinte existe en trois valeurs — un fond très clair, une pastille, un texte — et
`scripts/gen-palettes.mjs` les génère en assombrissant automatiquement chaque teinte jusqu'à
garantir **au moins 5:1 de contraste** entre le texte et son propre fond. C'est ce qui évite
les jaunes et les verts illisibles.

L'app devine aussi l'emoji et la couleur d'après ce qui est écrit : « déjeuner avec Léa »
devient 🍽️ pêche, « séance de sport » devient 🏃‍♀️ menthe. Un choix manuel a toujours le
dernier mot, et l'automatisme se coupe dans les réglages.

### Créer un événement

Titre libre, emoji, 9 couleurs, date via un mini-calendrier déplié dans la fiche, heures via
des roulettes façon iOS, toute la journée, lieu, notes, suppression. Appui long sur une carte
pour la cocher.

### Les réglages

Un bouton en haut à droite, deux onglets — **Vues** et **Confort** — pour que chaque écran
reste court. Les dispositions se choisissent en vignettes : chaque option dessine
son propre rendu en miniature, avec les couleurs du moment.

Le reste : emojis, ligne de l'heure actuelle, week-end en retrait, numéros de semaine,
masquer ce qui est fait, premier jour de la semaine. L'icône de gauche remet tout en place.

Tout est stocké **en local sur le téléphone** : aucun compte, aucun serveur, aucune donnée
qui sort. Interface entièrement en français.

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
  store/events.tsx          les événements + persistance AsyncStorage
  store/todos.tsx           la boîte à idées + persistance
  store/settings.tsx        les réglages d'affichage + persistance
  palettes.ts               les 5 jeux de couleurs (généré, contrastes vérifiés)
  lib/
    date.ts                 helpers de dates en français
    color.ts                conversions hex/hsl
    suggest.ts              l'emoji et la couleur devinés d'après le titre
    layout.ts               répartition des événements qui se chevauchent
    haptics.ts              retours haptiques
    id.ts
  screens/
    RootScreen.tsx          les trois onglets et les feuilles partagées
    HomeScreen.tsx          le résumé du jour
    CalendarScreen.tsx      l'agenda et ses cinq échelles
    TodoScreen.tsx          la boîte à idées
  components/
    DayBar.tsx              la journée en une barre
    TabBar.tsx              la barre du bas
    TodoCard.tsx / TodoSheet.tsx  la boîte à idées
    YearGrid.tsx            les douze mois de l'année
    MonthGrid.tsx           la grille du mois et ses cinq façons de remplir une case
    DayTimeline.tsx         la grille horaire, de 1 à 7 colonnes
    DayRail.tsx             la chronologie condensée
    PlannerList.tsx         le déroulé par jours
    WeekStrip.tsx           le bandeau de semaine
    EventCard.tsx           la carte d'événement de la liste
    EventSheet.tsx          la fiche de création / édition
    SettingsSheet.tsx       le panneau d'affichage
    previews.tsx            les vignettes de dispositions
    Wheel.tsx / TimeWheel.tsx  les roulettes d'heure
    Pager.tsx               pager horizontal générique
    ModeSwitch.tsx, SegmentedRow.tsx, OptionTile.tsx, Toggle.tsx,
    Squish.tsx, AddButton.tsx, EmptyDay.tsx
```

## Petits réglages

- **Exemples au premier lancement** : `SEED_ON_FIRST_LAUNCH` dans `src/store/events.tsx`
  et `src/store/todos.tsx`.
- **Couleurs** : les recettes sont dans `scripts/gen-palettes.mjs` ; `node scripts/gen-palettes.mjs`
  régénère `src/palettes.ts` et affiche les contrastes obtenus.
- **Hauteur d'une heure** dans la vue Jour : `HOUR_H` dans `src/components/DayTimeline.tsx`.
