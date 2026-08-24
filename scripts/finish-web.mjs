import fs from 'node:fs';
import path from 'node:path';

/**
 * Rend l'export web installable sur un téléphone.
 *
 * `expo export` produit une page web ordinaire : ajoutée à l'écran d'accueil
 * d'un iPhone, elle s'ouvrirait dans Safari, barres comprises. Ce script y
 * ajoute ce qui manque pour qu'elle se comporte comme une application —
 * plein écran, sa propre icône, son propre stockage — et un service worker
 * qui la garde utilisable sans réseau.
 *
 * Usage : EXPO_BASE_URL=/Agenda node scripts/finish-web.mjs
 */

const DIST = 'dist';
const BASE = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
const under = (file) => `${BASE}/${file}`;

const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error("finish-web : dist/index.html est absent — lancer d'abord « expo export ».");
  process.exit(1);
}

// --- icône ----------------------------------------------------------------
fs.copyFileSync('assets/icon.png', path.join(DIST, 'icon.png'));

// --- manifeste ------------------------------------------------------------
const manifest = {
  name: 'Agenda',
  short_name: 'Agenda',
  start_url: `${BASE}/`,
  scope: `${BASE}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#FBEFEA',
  theme_color: '#FBEFEA',
  icons: ['any', 'maskable'].map((purpose) => ({
    src: under('icon.png'),
    sizes: '1024x1024',
    type: 'image/png',
    purpose,
  })),
};
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// --- service worker -------------------------------------------------------
/* Le nom du bundle porte une empreinte de son contenu : s'en servir comme
   version de cache fait que chaque déploiement remplace proprement le
   précédent, au lieu de servir éternellement l'ancien. */
const bundleDir = path.join(DIST, '_expo/static/js/web');
const bundle = fs.readdirSync(bundleDir).find((f) => f.endsWith('.js'));
const version = bundle.replace(/[^a-z0-9]/gi, '').slice(-16);

const shell = [`${BASE}/`, under('index.html'), under('icon.png'), under('manifest.webmanifest'),
  `${BASE}/_expo/static/js/web/${bundle}`];

fs.writeFileSync(
  path.join(DIST, 'sw.js'),
  `const CACHE = 'agenda-${version}';
const SHELL = ${JSON.stringify(shell)};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Servir depuis le cache d'abord — l'app s'ouvre sans réseau — tout en
// rafraîchissant en arrière-plan pour la fois suivante.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit ?? caches.match(${JSON.stringify(under('index.html'))}));
      return hit ?? fresh;
    }),
  );
});
`,
);

// --- en-tête de la page ---------------------------------------------------
let html = fs.readFileSync(indexPath, 'utf8');

// viewport-fit=cover : sans lui, l'app ne peut pas mesurer l'encoche ni la
// barre du bas, et son contenu passe dessous en plein écran.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);

const head = `
    <link rel="manifest" href="${under('manifest.webmanifest')}" />
    <link rel="apple-touch-icon" href="${under('icon.png')}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Agenda" />
    <meta name="theme-color" content="#FBEFEA" />
    <script>
      if ('serviceWorker' in navigator) {
        addEventListener('load', function () {
          navigator.serviceWorker.register('${under('sw.js')}').catch(function () {});
        });
      }
    </script>
  </head>`;

html = html.replace('</head>', head);
fs.writeFileSync(indexPath, html);

console.log(`finish-web : PWA prête${BASE ? ` sous ${BASE}/` : ''} — manifeste, icône, service worker (${version}).`);
