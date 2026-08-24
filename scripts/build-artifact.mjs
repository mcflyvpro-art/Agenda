import fs from 'node:fs';
import path from 'node:path';
import { LOCK_JS, RESET_CSS } from './web-shell.mjs';

/**
 * Assemble l'app en un seul fichier HTML autonome.
 *
 * L'app se teste sur un téléphone, sans terminal : il faut donc une page
 * unique, sans requête vers l'extérieur — la politique de sécurité qui
 * l'héberge les bloquerait de toute façon. On prend le bundle produit par
 * `expo export`, on y remplace le chemin de la police par son contenu en
 * base64, et on enrobe le tout du strict minimum.
 *
 * Usage : npm run build:web && node scripts/build-artifact.mjs
 */

const DIST = 'dist';
const OUT = 'artifacts/agenda.html';
const BUNDLE_DIR = path.join(DIST, '_expo/static/js/web');

function fail(message) {
  console.error(`build-artifact : ${message}`);
  process.exit(1);
}

if (!fs.existsSync(BUNDLE_DIR)) fail(`${BUNDLE_DIR} est absent — lancer d'abord « npm run build:web ».`);

const bundleName = fs.readdirSync(BUNDLE_DIR).find((f) => f.endsWith('.js'));
if (!bundleName) fail('aucun bundle .js dans le dossier exporté.');

let js = fs.readFileSync(path.join(BUNDLE_DIR, bundleName), 'utf8');

// La police d'icônes est le seul fichier auquel le bundle fait appel.
const assets = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ttf')) assets.push(full);
  }
})(path.join(DIST, 'assets'));

for (const file of assets) {
  const url = '/' + path.relative(DIST, file).split(path.sep).join('/');
  if (!js.includes(url)) continue;
  const data = `data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}`;
  js = js.split(url).join(data);
}

const leftovers = js.match(/"\/assets\/[^"]+"/g);
if (leftovers) fail(`des fichiers ne sont pas embarqués : ${[...new Set(leftovers)].join(', ')}`);

// Une balise fermante à l'intérieur du script couperait la page en deux.
const closer = '</' + 'script';
if (js.includes(closer)) fail('le bundle contient une balise de fermeture de script.');

const html = `<title>Agenda</title>
<script>
${LOCK_JS}
${closer}>
<style id="expo-reset">${RESET_CSS}</style>
<div id="root"></div>
<noscript>You need to enable JavaScript to run this app.</noscript>
<script>
${js}
${closer}>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`${OUT} — ${(Buffer.byteLength(html) / 1048576).toFixed(2)} Mo, ${assets.length} fichier(s) embarqué(s)`);
