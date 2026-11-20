// Cross-check: runs the REAL web guide code (extracted from the v0.7
// index.html, with DOM stubs) and the TypeScript engine on the same cases,
// and compares the pick order. Run with: node scripts/engine-crosscheck.mjs
// (after: npx tsc src/engine/score.ts --outDir /tmp/engine-check --module commonjs --target es2020)
// Exit 0 when every case matches, 1 otherwise. This file is dev tooling
// only — it is never bundled into the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/data.json'), 'utf8'));
const engine = require('/tmp/engine-check/score.js');

// ---------- DOM stubs ----------
class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this._innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.dataset = {};
    this.style = {};
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false,
    };
    this._listeners = {};
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(v) {
    this._innerHTML = String(v);
  }
  setAttribute() {}
  getAttribute() {
    return null;
  }
  addEventListener() {}
  removeEventListener() {}
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  remove() {}
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
  }
  focus() {}
  blur() {}
  scrollIntoView() {}
  getBoundingClientRect() {
    return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 };
  }
}

const byId = new Map();
const documentStub = {
  getElementById(id) {
    if (!byId.has(id)) byId.set(id, new FakeElement());
    return byId.get(id);
  },
  createElement(tag) {
    return new FakeElement(tag);
  },
  addEventListener() {},
  documentElement: new FakeElement('html'),
  body: new FakeElement('body'),
};
const windowStub = {
  addEventListener() {},
  innerHeight: 800,
  innerWidth: 400,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
};
const navigatorStub = {};

// ---------- load and run the real web script ----------
const html = fs.readFileSync(
  '/home/hatch/workspace/ts-spaces/deadlock-counter-buying-guide/index.html',
  'utf8',
);
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('no script block found in web guide');
const webScript = scriptMatch[1];

// The driver runs in the same function scope as the web script, so it can
// reach `state`, `quickState`, `recommend` and `quickRecommend` directly.
function runWebCase(driver) {
  const body = `${webScript}\n;return (function(){ ${driver} })();`;
  const fn = new Function('document', 'window', 'navigator', body);
  return fn(documentStub, windowStub, navigatorStub);
}

function pickNames(htmlOut) {
  return [...htmlOut.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
}

function webFull(enemyHero, enemyItems, youHero, youItems) {
  const out = runWebCase(`
    state.enemyHero = ${JSON.stringify(enemyHero)};
    state.youHero = ${JSON.stringify(youHero)};
    state.enemyItems = ${JSON.stringify(enemyItems)};
    state.youItems = ${JSON.stringify(youItems)};
    state.enemySlots = state.enemyItems.concat(new Array(12 - state.enemyItems.length).fill(null));
    state.youSlots = state.youItems.concat(new Array(12 - state.youItems.length).fill(null));
    recommend();
    return document.getElementById('results-body').innerHTML;
  `);
  return pickNames(out);
}

function webQuick(enemyHero, enemyType, youType) {
  const out = runWebCase(`
    quickState.hero = ${JSON.stringify(enemyHero)};
    quickState.enemyType = ${JSON.stringify(enemyType)};
    quickState.youType = ${JSON.stringify(youType)};
    quickRecommend();
    return document.getElementById('quick-results-body').innerHTML;
  `);
  return pickNames(out);
}

// ---------- cases ----------
const fullCases = [
  { label: 'Mina, no items', input: { enemyHero: 'Mina', enemyItems: [], youHero: null, youItems: [] } },
  { label: 'Mina, Glass Cannon + Sharpshooter', input: { enemyHero: 'Mina', enemyItems: ['Glass Cannon', 'Sharpshooter'], youHero: null, youItems: [] } },
  { label: 'Mina, Boundless Spirit + Mystic Reverb', input: { enemyHero: 'Mina', enemyItems: ['Boundless Spirit', 'Mystic Reverb'], youHero: null, youItems: [] } },
  { label: 'Victor, Leech + Healing Tempo', input: { enemyHero: 'Victor', enemyItems: ['Leech', 'Healing Tempo'], youHero: null, youItems: [] } },
  { label: 'Haze, Leech + Healing Tempo + Glass Cannon, you Abrams', input: { enemyHero: 'Haze', enemyItems: ['Leech', 'Healing Tempo', 'Glass Cannon'], youHero: 'Abrams', youItems: [] } },
  { label: 'Abrams, Unstoppable + Metal Skin', input: { enemyHero: 'Abrams', enemyItems: ['Unstoppable', 'Metal Skin'], youHero: null, youItems: [] } },
  { label: 'Wraith, no items, you Haze', input: { enemyHero: 'Wraith', enemyItems: [], youHero: 'Haze', youItems: [] } },
  { label: 'Yamato, Glass Cannon', input: { enemyHero: 'Yamato', enemyItems: ['Glass Cannon'], youHero: null, youItems: [] } },
  { label: 'Pocket, Refresher', input: { enemyHero: 'Pocket', enemyItems: ['Refresher'], youHero: null, youItems: [] } },
  { label: 'Infernus, Fortitude + Extra Health', input: { enemyHero: 'Infernus', enemyItems: ['Fortitude', 'Extra Health'], youHero: null, youItems: [] } },
  { label: 'Bebop, Warp Stone + Kinetic Dash', input: { enemyHero: 'Bebop', enemyItems: ['Warp Stone', 'Kinetic Dash'], youHero: null, youItems: [] } },
  { label: 'Lady Geist, Spirit Lifesteal + Mystic Burst, you own Toxic Bullets', input: { enemyHero: 'Lady Geist', enemyItems: ['Spirit Lifesteal', 'Mystic Burst'], youHero: null, youItems: ['Toxic Bullets'] } },
];

const quickCases = [
  { label: 'Mina, buying Gun', input: { enemyHero: 'Mina', enemyType: 'Weapon', youType: '' } },
  { label: 'Mina, buying Spirit, want Spirit', input: { enemyHero: 'Mina', enemyType: 'Spirit', youType: 'Spirit' } },
  { label: 'Victor, buying Health, want Gun', input: { enemyHero: 'Victor', enemyType: 'Vitality', youType: 'Weapon' } },
  { label: 'Haze, no types', input: { enemyHero: 'Haze', enemyType: '', youType: '' } },
  { label: 'Wraith, buying Gun, want Health', input: { enemyHero: 'Wraith', enemyType: 'Weapon', youType: 'Vitality' } },
  { label: 'Calico, buying Gun', input: { enemyHero: 'Calico', enemyType: 'Weapon', youType: '' } },
];

let failures = 0;
function compare(label, webPicks, tsPicks) {
  const same =
    webPicks.length === tsPicks.length && webPicks.every((n, i) => n === tsPicks[i]);
  if (same) {
    console.log(`PASS  ${label}\n      top: ${webPicks.join(' · ')}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label}`);
    console.log(`      web: ${webPicks.join(' · ')}`);
    console.log(`      ts:  ${tsPicks.join(' · ')}`);
  }
}

for (const c of fullCases) {
  const web = webFull(c.input.enemyHero, c.input.enemyItems, c.input.youHero, c.input.youItems);
  const ts = engine.scoreFull(data, c.input).picks.map((p) => p.name);
  compare(`FULL ${c.label}`, web, ts);
}
for (const c of quickCases) {
  const web = webQuick(c.input.enemyHero, c.input.enemyType, c.input.youType);
  const ts = engine.scoreQuick(data, c.input).picks.map((p) => p.name);
  compare(`QUICK ${c.label}`, web, ts);
}

console.log(failures === 0 ? '\nAll cases match.' : `\n${failures} case(s) mismatch.`);
process.exit(failures === 0 ? 0 : 1);
