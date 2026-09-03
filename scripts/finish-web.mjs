import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { LOCK_JS, RESET_CSS, VIEWPORT } from './web-shell.mjs';

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

/* --- icône ----------------------------------------------------------------

   Le nom du fichier porte une empreinte de son contenu, comme le bundle.

   Sans ça, l'icône s'appelle toujours `icon.png` : iOS la retient au
   moment où l'app est ajoutée à l'écran d'accueil et ne redemande jamais
   la même URL, même après un nouveau déploiement. Réinstaller la PWA
   ramenait donc l'ancienne image indéfiniment. Une empreinte différente
   à chaque image change l'URL, ce qu'aucun cache ne peut confondre avec
   la précédente. */
const stamp = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);

const iconBytes = fs.readFileSync('assets/icon.png');
const iconFile = `icon.${stamp(iconBytes)}.png`;
fs.writeFileSync(path.join(DIST, iconFile), iconBytes);

/* Le favicon qu'`expo export` produit est référencé en `/favicon.ico`, à la
   racine du domaine — or GitHub Pages sert le site depuis `/Agenda/`. Le
   navigateur allait donc chercher le favicon d'un autre site, et affichait
   le sien. On le republie sous la base, empreinté lui aussi. */
const faviconSrc = path.join(DIST, 'favicon.ico');
const faviconFile = fs.existsSync(faviconSrc)
  ? (() => {
      const bytes = fs.readFileSync(faviconSrc);
      const name = `favicon.${stamp(bytes)}.ico`;
      fs.writeFileSync(path.join(DIST, name), bytes);
      return name;
    })()
  : null;

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
    src: under(iconFile),
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

const shell = [`${BASE}/`, under('index.html'), under(iconFile), under('manifest.webmanifest'),
  `${BASE}/_expo/static/js/web/${bundle}`,
  ...(faviconFile ? [under(faviconFile)] : [])];

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

/* --- notifications -------------------------------------------------------

   C'est ici, et nulle part ailleurs, qu'un rappel peut s'afficher alors que
   l'application est fermée : le service worker est réveillé par le système
   même quand aucune page n'est ouverte. Le message arrive déjà rédigé par le
   serveur — titre, texte, jour — il ne reste qu'à le montrer. */
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (_) {
    data = { title: 'Agenda', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Agenda', {
      body: data.body || '',
      icon: ${JSON.stringify(under(iconFile))},
      badge: ${JSON.stringify(under(iconFile))},
      // le même repère pour un même rappel : deux tours ne peuvent pas
      // empiler deux fois la même notification à l'écran
      tag: data.tag || 'agenda',
      renotify: true,
      data: { date: data.date || null },
    }),
  );
});

/* Toucher la notification ouvre l'app — celle qui est déjà là si possible,
   plutôt qu'un second exemplaire par-dessus. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const home = ${JSON.stringify(`${BASE}/`)};
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(home) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(home);
    }),
  );
});
`,
);

// --- en-tête de la page ---------------------------------------------------
let html = fs.readFileSync(indexPath, 'utf8');

// Zoom, double-tap et rebond coupés, et viewport-fit pour que l'app puisse
// mesurer l'encoche au lieu de dessiner dessous.
html = html.replace(/<meta name="viewport"[^>]*>/, `<meta name="viewport" content="${VIEWPORT}" />`);
// le reset d'Expo laisse la page zoomable et élastique : on le remplace
html = html.replace(/<style id="expo-reset">[\s\S]*?<\/style>/, `<style id="expo-reset">${RESET_CSS}</style>`);
// le favicon d'Expo pointe à la racine du domaine, pas sous la base du site
if (faviconFile) {
  html = html.replace(
    /<link rel="icon"[^>]*>/,
    `<link rel="icon" href="${under(faviconFile)}" />`,
  );
}

const head = `
    <link rel="manifest" href="${under('manifest.webmanifest')}" />
    <link rel="apple-touch-icon" href="${under(iconFile)}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Agenda" />
    <meta name="theme-color" content="#FBEFEA" />
    <script>${LOCK_JS}
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
