# Synchronisation téléphone ↔ ordinateur

Rien n'est branché pour l'instant : l'application est entièrement locale.
Ce dossier contient les coutures pour qu'elle ne le reste pas, et rien de
plus — aucune dépendance réseau n'a été ajoutée.

## Ce qui est déjà en place

| Fichier | Rôle |
| --- | --- |
| `types.ts` | `SyncMeta` (les trois champs que chaque fiche doit porter) et l'interface `SyncAdapter` |
| `merge.ts` | fusion « dernier écrit gagne », fiche par fiche, pierres tombales comprises |
| `device.ts` | identité stable de l'appareil, pour reconnaître ses propres écritures |
| `adapter.ts` | le dos actif — `localOnly` aujourd'hui, `setAdapter()` pour en brancher un autre |

Les magasins (`src/store/events.tsx`, `src/store/todos.tsx`) écrivent déjà
`updatedAt`, `deletedAt` et `origin` sur chaque fiche, et une suppression y
est une pierre tombale, pas un retrait de tableau. Autrement dit : le jour
où la base arrive, **les données locales sont déjà au bon format** et rien
n'est à migrer.

## Le jour où on branche Supabase

1. `npm i @supabase/supabase-js`
2. Créer les tables (SQL ci-dessous).
3. Écrire `src/sync/supabase.ts` : une implémentation de `SyncAdapter`,
   une centaine de lignes.
4. Dans `App.tsx`, avant le rendu :
   ```ts
   setAdapter(supabaseAdapter({ url: …, anonKey: … }));
   ```

Les clés vont dans `app.config.ts` sous `extra`, pas en dur dans le code.
La clé `anon` de Supabase est publique par conception — c'est la RLS qui
protège, pas le secret de la clé.

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
  date        date not null,
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

create policy "mes événements" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mes idées" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

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
