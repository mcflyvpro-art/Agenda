# Synchronisation téléphone ↔ ordinateur

Branchée sur Supabase (projet « Agenda », région eu-west-1). Sans
connexion, l'application reste entièrement locale, exactement comme
avant — se connecter (dans Réglages → Synchronisation) est ce qui bascule
du premier au second dos, rien d'autre.

## Ce qui est en place

| Fichier | Rôle |
| --- | --- |
| `types.ts` | `SyncMeta` (les trois champs que chaque fiche porte) et l'interface `SyncAdapter` |
| `merge.ts` | fusion « dernier écrit gagne », fiche par fiche, pierres tombales comprises |
| `device.ts` | identité stable de l'appareil, pour reconnaître ses propres écritures |
| `adapter.ts` | le dos actif — `localOnly` par défaut, `setAdapter()` bascule vers l'autre |
| `config.ts` | URL du projet + clé publique (anon) — volontairement publique, voir plus bas |
| `supabaseClient.ts` | le client Supabase, session persistée via `AsyncStorage` |
| `auth.ts` | `useAuthSession`, `signIn`, `signOut` — un compte, partagé par les deux appareils |
| `supabase.ts` | l'implémentation de `SyncAdapter` : conversion des lignes, `pull`/`push`/`subscribe` |
| `engine.ts` | `useCloudSync` — descend au démarrage et sur notification, monte après un court silence |

Les magasins (`src/store/events.tsx`, `src/store/todos.tsx`) exposent
`mergeRemote()`, appelé par le moteur pour fusionner ce qui vient du
serveur sans jamais passer par `save()` (qui, lui, marquerait la fiche
comme venant de cet appareil).

## Authentification

Un seul compte Supabase (e-mail + mot de passe), le même sur les deux
appareils — c'est ce qui les relie. Pas d'inscription depuis l'app : le
compte a été créé une fois depuis la console. Se connecter depuis
Réglages ne fait que rejouer cette identité sur un appareil de plus ; la
session, une fois posée, survit aux rechargements.

## Sécurité des clés

La clé publiée dans `config.ts` (`anon` / `sb_publishable_…`) est faite
pour voyager jusque dans le navigateur — c'est la Row Level Security des
tables qui protège les données, pas le secret de cette clé. Elle peut
donc rester dans le dépôt, y compris hébergé publiquement sur GitHub
Pages : ce que quelqu'un d'autre pourrait faire avec, au pire, c'est
tenter de se connecter avec son propre compte — chose qu'il pourrait
déjà faire directement contre l'API Supabase sans cette clé.

La clé `service_role` (secrète, celle qui contourne la RLS) n'apparaît
et n'apparaîtra **nulle part dans ce dépôt**. Le schéma a été posé une
fois depuis l'intégration Supabase du poste de développement, jamais
depuis le client. Si cette clé venait à circuler ailleurs, la seule
action utile serait de la faire tourner depuis la console Supabase
(Project Settings → API) — jamais de la coller dans du code.

## Schéma

Une seule personne utilise l'application, mais les tables portent quand
même un `user_id` : c'est ce qui permet à la RLS de faire son travail, et
ça évite une migration pénible si un deuxième compte apparaît un jour.

```sql
create table public.events (
  id          text primary key,
  user_id     uuid not null references auth.users(id) default auth.uid(),
  title       text not null default '',
  emoji       text not null default '✨',
  color       text not null default 'lavender',
  date        text not null,
  start_min   int  not null,
  end_min     int  not null,
  all_day     boolean not null default false,
  location    text not null default '',
  notes       text not null default '',
  done        boolean not null default false,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint,
  origin      text not null default ''
);

create table public.todos (
  id          text primary key,
  user_id     uuid not null references auth.users(id) default auth.uid(),
  title       text not null default '',
  notes       text not null default '',
  done        boolean not null default false,
  estimate    int  not null default 60,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint,
  origin      text not null default ''
);

-- le pull ne demande que ce qui a bougé : cet index est ce qui le rend rapide
create index events_sync_idx on public.events (user_id, updated_at);
create index todos_sync_idx  on public.todos  (user_id, updated_at);

alter table public.events enable row level security;
alter table public.todos  enable row level security;

create policy "mes evenements" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mes idees" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pour que `subscribe()` reçoive les changements en temps réel
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.todos;
```

Ce schéma est déjà posé sur le projet — ce bloc documente ce qui existe,
il n'est plus à rejouer.

## Le protocole, en trois lignes

- **pull** : `select * where updated_at > cursor` — les pierres tombales
  arrivent avec le reste, puisqu'une suppression est une ligne modifiée.
- **push** : `upsert` du lot en attente. Là encore une suppression est un
  `upsert` avec `deleted_at` rempli, jamais un `delete`.
- **fusion** : `mergeById` côté client. À `updatedAt` égal, le serveur
  gagne — c'est arbitraire mais il faut trancher, et ça évite deux
  appareils qui se renvoient indéfiniment la même fiche.

## Deux pièges à ne pas oublier

**L'horloge.** `updatedAt` vient de l'appareil. Un téléphone mal réglé
peut se croire dans le futur et gagner tous les conflits pour toujours. Au
moment de brancher la base, prendre `now()` du serveur au `push` et le
renvoyer, plutôt que de faire confiance au client.

**Les pierres tombales.** `collectGarbage()` les purge après soixante
jours. Ce délai doit rester plus long que la plus longue période pendant
laquelle un appareil peut rester éteint — sinon il ressuscite à son
réveil tout ce qui a été supprimé pendant son absence.
