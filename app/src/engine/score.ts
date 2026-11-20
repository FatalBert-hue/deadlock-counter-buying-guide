// Counter-buy engine — pure TypeScript, no React Native imports.
// A faithful port of the web guide's recommendation logic (v0.7), plus the
// item-effect algorithm as a data-driven layer: it reads the enemy's items,
// reads what those items do (their effect tags), and scores every counter
// item against those effects. No AI, no network, no randomness.
//
// Order of scoring, exactly as Mikel settled it:
//   1. Pro counter-buy rules (per-hero pro kit, then the shared pro matrix)
//   2. The item-effect algorithm (tag-driven, per enemy item)
//   3. The general threat read from the enemy hero's tags
//   4. Your hero's delivery + owned-item upgrades
// Unknown hero/item names are dropped, never crash.
import type { CounterInfo, GuideData, Hero, Item } from '@/data';

export interface RankedPick {
  name: string;
  score: number;
  peak: number;
  reasons: string[];
  info: CounterInfo;
}

export interface ScoreNote {
  kind: 'antiheal-owned' | 'healbane-both' | 'stealth-gap' | 'pro-framing';
  text: string;
}

export interface ScoreResult {
  enemyHero: Hero | null;
  youHero: Hero | null;
  /** Shortlist after the diversity cap (top N). */
  picks: RankedPick[];
  /** Full ranking before the diversity cap. */
  ranked: RankedPick[];
  threatLabels: string[];
  notes: ScoreNote[];
  /** Names the caller passed in that are not in the data (dropped). */
  droppedUnknown: string[];
  /** Full build only: the top pick costs more than the stated budget. */
  topOverBudget: boolean;
  /** Quick pick only: the shortlist was narrowed to the item type you want. */
  narrowed: boolean;
}

export interface FullInput {
  enemyHero: string | null;
  enemyItems: string[];
  youHero: string | null;
  youItems: string[];
  /** Souls budget; 0 or omitted means no budget filter. */
  budget?: number;
}

export interface QuickInput {
  enemyHero: string | null;
  enemyType: 'Weapon' | 'Vitality' | 'Spirit' | '';
  youType: 'Weapon' | 'Vitality' | 'Spirit' | '';
}

export const MAX_SLOTS = 12;

export function heroByName(data: GuideData, name: string | null): Hero | null {
  if (!name) return null;
  return data.heroes.find((h) => h.name === name) ?? null;
}

export function itemByName(data: GuideData, name: string): Item | null {
  return data.items.find((i) => i.name === name) ?? null;
}

export function itemSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type AddFn = (name: string, pts: number, why: string) => void;

interface Scorer {
  add: AddFn;
  scores: Record<string, number>;
  reasons: Record<string, string[]>;
  peaks: Record<string, number>;
}

function createScorer(data: GuideData): Scorer {
  const scores: Record<string, number> = {};
  const reasons: Record<string, string[]> = {};
  const peaks: Record<string, number> = {};
  const add: AddFn = (name, pts, why) => {
    if (!data.counters[name]) return;
    scores[name] = (scores[name] || 0) + pts;
    if (pts > (peaks[name] || 0)) peaks[name] = pts;
    (reasons[name] = reasons[name] || []).push(why);
  };
  return { add, scores, reasons, peaks };
}

function toRanked(data: GuideData, scorer: Scorer): RankedPick[] {
  return Object.keys(scorer.scores)
    .map((n) => ({
      name: n,
      score: scorer.scores[n],
      peak: scorer.peaks[n] || 0,
      reasons: scorer.reasons[n],
      info: data.counters[n],
    }))
    .sort((a, b) => b.score - a.score || b.peak - a.peak || a.info.cost - b.info.cost);
}

/** This hero's signature answers — the pro kit first, the signature kit as fallback. */
function applySignature(data: GuideData, add: AddFn, hero: Hero): void {
  const kit = data.proKit[hero.name] ?? data.signature[hero.name];
  if (!kit) return;
  kit.forEach(([name, pts, why]) => add(name, pts, why));
}

/** The general threat read from a hero's tags — fills out a shortlist, never decides it. */
function applyHeroKit(add: AddFn, hero: Hero): void {
  const tags = hero.tags;
  const T = (t: string) => tags.indexOf(t) !== -1;
  if (T('heal')) {
    add('Toxic Bullets', 4, `${hero.name} sustains through fights — cutting their healing by 40% is how the brawl actually ends.`);
    add('Decay', 3, 'Percentage damage plus 55% healing reduction is built for a self-healing frontliner like ' + hero.name + '.');
    add('Healbane', 2, 'Budget anti-heal while you save for a bigger answer.');
    add('Spirit Burn', 3, 'The late-game anti-heal finisher if ' + hero.name + ' is still unkillable at Tier 4.');
    add('Crippling Headshot', 2, 'Headshots stack 40% anti-heal on a target who wants long fights.');
  }
  if (T('teamheal')) {
    add('Toxic Bullets', 2, `${hero.name} heals their whole team — anti-heal on the target you're focusing cuts the value of every heal they throw.`);
    add('Healbane', 3, `${hero.name} is a healing support: Healbane is the cheap, early answer supports buy into other supports.`);
    add('Decay', 2, `Decay on their carry makes ${hero.name}'s heals land at 45% value.`);
    add('Spirit Burn', 2, 'If their healing is winning teamfights late, Spirit Burn is the strongest anti-heal in the shop.');
  }
  if (T('gun')) {
    add('Metal Skin', 3, `${hero.name}'s damage is bullets — 5 seconds of bullet immunity deletes their burst window.`);
    add('Bullet Resilience', 3, '+35% Bullet Resist works in every fight against a gun hero, not just one window.');
    add('Return Fire', 2, 'Rapid gunfire means constant Return Fire procs — they punish themselves for shooting you.');
  }
  if (T('spirit')) {
    add('Spirit Resilience', 3, `${hero.name}'s damage is spirit — +30% Spirit Resist (45% below half health) blunts every combo.`);
    add('Counterspell', 2, `One well-timed parry can eat ${hero.name}'s key ability entirely.`);
    add('Spellbreaker', 2, 'The Tier 4 step-up if their spirit damage is still deleting you late.');
  }
  if (T('cc')) {
    add('Unstoppable', 4, `${hero.name}'s kit is crowd control — 5.5s of stun/silence/root immunity lets you play through the engage.`);
    add('Dispel Magic', 3, `Purge the slows, hexes and marks ${hero.name} leaves on you — just don't wait until you're stunned.`);
    add('Debuff Reducer', 2, 'Cheap Tier 2 insurance against their debuffs while you build to Unstoppable.');
    add('Reactive Barrier', 1, 'A barrier eats the first hit of their catch.');
  }
  if (T('air')) {
    add('Knockdown', 4, `${hero.name} fights from the air — Knockdown's stun lasts longer vs airborne targets and slams them down with extra gravity.`);
    add('Phantom Strike', 3, 'Teleport to them, pull them to the ground, disarm them. The sky stops being safe.');
    add('Capacitor', 2, "Capacitor's projectile blocks stamina and silences movement abilities — no dashing out after landing.");
  }
  if (T('stealth')) {
    add("Hunter's Aura", 2, "No verified reveal/true-sight counter-buy exists in the pro sources checked — don't buy one expecting it. Up close, Hunter's Aura cuts their Fire Rate by 15% and Bullet Resist by 10%, and a stealther must come close to kill you.");
  }
  if (T('channel')) {
    add('Cursed Relic', 3, `${hero.name} has a channelled threat — Cursed Relic interrupts it and silences, disarms and item-blocks them for 3.25s.`);
    add('Knockdown', 3, 'Knockdown\'s delayed stun lands on a stationary, channelling target.');
    add('Silence Wave', 2, "Fire Silence Wave before the combo starts — it won't interrupt a channel already running, so timing is everything.");
    add('Focus Lens', 2, 'A 4.5s targeted silence takes their big ability out of the fight entirely.');
  }
  if (T('mobile')) {
    add('Slowing Bullets', 2, 'Your bullets build −24% Move Speed and cut dash distance — mobility only works if they can move.');
    add('Slowing Hex', 2, 'Slowing Hex also silences movement items and abilities, so there\'s no Warp Stone out.');
    add('Inhibitor', 2, 'Tier 4: slows them and reduces their damage when you hit them.');
    add('Capacitor', 1, 'Blocks stamina use entirely — no dashes, no extra jumps.');
  }
  if (T('tank')) {
    add('Decay', 2, `Decay deals damage based on current health — the bigger ${hero.name}'s health bar, the harder it hits.`);
    add('Escalating Exposure', 2, 'Stacking spirit amplification melts a hero who bought health instead of resists.');
    add('Spirit Rend', 2, 'Shred their Spirit Resist with your bullets so your team\'s spirit damage lands.');
    add('Toxic Bullets', 1, 'Bleed is percentage-based (1.9% max HP/s) — it scales with their health bar.');
  }
  if (T('burst')) {
    add('Reactive Barrier', 2, `A barrier for the first second of ${hero.name}'s combo is often the difference between living and the death recap.`);
    add('Ethereal Shift', 2, 'Void out for 4s and let the burst combo whiff.');
    add('Cheat Death', 1, "If you're always the focus target, Cheat Death buys one more life per 90s.");
  }
  if (T('dot')) {
    add('Dispel Magic', 3, 'Burns and poisons are non-ultimate debuffs — Dispel Magic purges them and heals you for 250.');
    add('Debuff Reducer', 2, 'Shorter burns, shorter problems.');
  }
  if (T('sniper')) {
    add('Warp Stone', 2, 'Blink 11m out of the sightline and pick up +30% Bullet Resist doing it.');
    add('Metal Skin', 1, 'Walk the sightline during their shot window with bullet immunity up.');
  }
  if (T('melee')) {
    add('Slowing Bullets', 1, 'A slowed melee hero is a kited melee hero.');
    add('Colossus', 1, "If they insist on brawling you, Colossus lets you brawl back with +35% resists.");
  }
}

export interface MatrixCtx {
  sustain: string[];
  gun: number;
  spirit: number;
  tank: number;
  mobility: number;
  unstoppable: boolean;
  counterspell: boolean;
  metalSkin: boolean;
  lockItems: string[];
}

/** The validated pro shared matrix — applies to every hero, triggered by what the enemy bought. */
function applyProMatrix(add: AddFn, ctx: MatrixCtx): void {
  if (ctx.sustain.length) {
    const first = ctx.sustain[0];
    add('Healbane', 6, `PRO MATRIX — If they have sustain/healing/lifesteal items (${first} etc.), then suggest Healbane if you deal spirit damage — anti-heal matched to YOUR damage type. Pro rule · Strong (HB + IB)`);
    add('Toxic Bullets', 6, `PRO MATRIX — If they have sustain items (${first}), then suggest Toxic Bullets if you deal gun damage. Pro rule · Strong (HB + IB)`);
    add('Decay', 5, `PRO MATRIX — If they have sustain items (${first}), then suggest Decay as the either-damage targeted active. Pro rule · Strong (HB + IB)`);
    add('Spirit Burn', 4, 'PRO MATRIX — If they have heavy sustain late, then suggest Spirit Burn, the Tier 4 finisher. Pro rule · Strong (HB + IB)');
    add('Inhibitor', 4, "PRO MATRIX — If they have sustain and you deal gun damage, then suggest Inhibitor: −40% healing plus −30% of their damage. Pro rule · Strong (HB)");
  }
  if (ctx.gun) {
    add('Metal Skin', 6, 'PRO MATRIX — If they have gun/bullet-damage items, then suggest Metal Skin for commits: 5s of bullet immunity. Pro rule · Strong (HB)');
    add('Disarming Hex', 5, 'PRO MATRIX — If they have gun items and a carry is fed, then suggest Disarming Hex to stop them shooting for 4.25s. Pro rule · Strong (HB)');
    add('Rusted Barrel', 4, 'PRO MATRIX — If they have gun items, then suggest Rusted Barrel/Suppressor-class fire-rate cuts in lane. Pro rule · Strong (HB)');
    add('Suppressor', 4, 'PRO MATRIX — If they have high-fire-rate gun items and you deal spirit damage, then suggest Suppressor. Pro rule · Strong (HB)');
    add('Bullet Resilience', 4, 'PRO MATRIX — If they have gun items, then suggest Bullet Resilience for always-on resist. Pro rule · Strong (HB)');
    add('Weapon Shielding', 3, 'PRO MATRIX — If they have gun items early, then suggest Weapon Shielding (+18% bullet resist + barrier). Pro rule · Strong (HB)');
  }
  if (ctx.spirit) {
    add('Spirit Resilience', 6, 'PRO MATRIX — If they have spirit/burst items, then suggest Spirit Resilience for repeated pressure. Pro rule · Strong (HB)');
    add('Spellbreaker', 5, 'PRO MATRIX — If they have spirit burst items, then suggest Spellbreaker for one big hit (≥175 cut by 65%). Pro rule · Strong (HB)');
    add('Spirit Shielding', 4, 'PRO MATRIX — If they have spirit items in lane, then suggest Spirit Shielding for the burst window. Pro rule · Strong (HB)');
    add('Spirit Sap', 4, 'PRO MATRIX — If they have spirit items, then suggest Spirit Sap to cut their Spirit Power. Pro rule · Strong (HB)');
  }
  if (ctx.tank) {
    add('Armor Piercer', 6, 'PRO MATRIX — If they have tank/health/bullet-resist items, then suggest Armor Piercer: 60% of bullets ignore bullet resist and barriers. Pro rule · Moderate (HB)');
    add('Tankbuster', 5, 'PRO MATRIX — If they have tank items, then suggest Tankbuster: +7.5% current-health spirit damage. Pro rule · Moderate (HB)');
    add('Escalating Exposure', 5, 'PRO MATRIX — If they have tank items, then suggest Escalating Exposure: stacking spirit damage taken. Pro rule · Moderate (HB)');
    add('Siphon Bullets', 4, 'PRO MATRIX — If they have tank items, then suggest Siphon Bullets to steal max health. Pro rule · Moderate (HB)');
    add('Toxic Bullets', 4, 'PRO MATRIX — If they have tank items, then suggest Toxic Bullets: the bleed scales with max health. Pro rule · Moderate (HB)');
  }
  if (ctx.mobility) {
    add('Slowing Hex', 6, 'PRO MATRIX — If they have mobility items (Warp Stone, movement actives), then suggest Slowing Hex — it silences movement abilities AND items. Pro rule · Strong (HB)');
    add('Slowing Bullets', 4, 'PRO MATRIX — If they have mobility items and you deal gun damage, then suggest Slowing Bullets. Pro rule · Moderate (HB)');
    add('Mystic Slow', 4, 'PRO MATRIX — If they have mobility items and you deal spirit damage, then suggest Mystic Slow. Pro rule · Moderate (HB)');
  }
  if (ctx.unstoppable) {
    add('Spirit Resilience', 3, 'PRO MATRIX — If they have Unstoppable, then Knockdown and Cursed Relic will NOT work on them: pivot to resistances/mobility and wait it out. Pro rule · Moderate (GF + HB)');
    add('Warp Stone', 3, "PRO MATRIX — If they have Unstoppable, don't spend on CC they'll shrug off — mobility and resists are the honest answer. Pro rule · Moderate (GF + HB)");
  }
  if (ctx.counterspell) {
    add('Slowing Bullets', 3, 'PRO MATRIX — If they have Counterspell, do NOT open with your telegraphed ability: bait the parry with a light attack/gunfire first — it blocks only the first application of stacking effects. Pro rule · Strong (HB)');
  }
  if (ctx.metalSkin) {
    add('Decay', 3, 'PRO MATRIX — If they have Metal Skin, do not feed gun damage into its 5s window: use spirit damage or disengage until it ends. Pro rule · Thin (single thread, principle-level)');
    add('Escalating Exposure', 3, 'PRO MATRIX — If they have Metal Skin, spirit damage ignores it entirely. Pro rule · Thin (principle-level)');
  }
  if (ctx.lockItems.length) {
    add('Unstoppable', 4, `PRO MATRIX — If they have ${ctx.lockItems[0]} and you channel an ult, then suggest Unstoppable to protect your own channel. Pro rule · Moderate (HB + GF)`);
  }
}

/* ============ ITEM-EFFECT ALGORITHM ============ */
/* Reads each enemy item, reads what it does (its effect tags), and scores
   the counters that answer that effect. Data-driven: any item carrying an
   effect tag gets answered, not just the named items. Named specials stay
   as named triggers because their answers depend on the specific item. */
interface EffectCounter {
  item: string;
  pts: number;
  why: (itemName: string) => string;
}

const EFFECT_COUNTERS: Record<string, EffectCounter[]> = {
  heal: [
    { item: 'Toxic Bullets', pts: 4, why: (n) => `They bought ${n} — that's healing you have to cut, or it never dies.` },
    { item: 'Decay', pts: 4, why: (n) => `${n} plus a healing kit means Decay's 55% reduction earns its slot.` },
    { item: 'Healbane', pts: 2, why: (n) => `${n} is exactly what Healbane exists for — just don't stack it with a teammate's.` },
    { item: 'Spirit Burn', pts: 2, why: (n) => `Against ${n}-level sustain, Spirit Burn is the late-game finisher.` },
  ],
  antiheal: [
    { item: 'Cheat Death', pts: 1, why: (n) => `They bought ${n}, so your own healing is cut — answers that don't rely on healing (barriers, Cheat Death) go up in value.` },
    { item: 'Colossus', pts: 1, why: (n) => `With ${n} cutting your sustain, resist-based defence beats lifesteal-based defence.` },
  ],
  spirit: [
    { item: 'Spirit Resilience', pts: 3, why: (n) => `They're investing in Spirit (${n}) — resists scale against the whole build, not one ability.` },
    { item: 'Counterspell', pts: 1, why: (n) => `${n} powers one big ability — parry it.` },
  ],
  tank: [
    { item: 'Decay', pts: 3, why: (n) => `They bought ${n} to get tankier — percentage damage doesn't care how big the health bar is.` },
    { item: 'Escalating Exposure', pts: 1, why: (n) => `${n} means long fights; escalating spirit amp wins long fights.` },
    { item: 'Spirit Rend', pts: 1, why: (n) => `Shred the resists ${n} represents.` },
  ],
  mobility: [
    { item: 'Slowing Hex', pts: 2, why: (n) => `They bought ${n} — Slowing Hex silences movement items, so the escape simply doesn't fire.` },
    { item: 'Slowing Bullets', pts: 2, why: (n) => `Keep them slowed and ${n} never gets its value.` },
    { item: 'Knockdown', pts: 1, why: () => 'Ground them after the leap — Knockdown punishes airborne targets.' },
  ],
  stealth: [
    { item: "Hunter's Aura", pts: 2, why: (n) => `They bought ${n} for stealth — no verified reveal/true-sight counter-buy exists in any pro source checked, so don't buy one expecting it; Hunter's Aura at least cuts their fire rate once they have to come within 15m and into the open to hit you.` },
  ],
};

const NAMED_ITEM_COUNTERS: Record<string, EffectCounter[]> = {
  'Glass Cannon': [
    { item: 'Metal Skin', pts: 3, why: (n) => `They bought ${n} — a glass cannon's whole window fits inside Metal Skin's 5 seconds.` },
    { item: 'Bullet Resilience', pts: 2, why: (n) => `${n} is pure bullet damage; resist it permanently.` },
  ],
  Sharpshooter: [
    { item: 'Metal Skin', pts: 3, why: (n) => `They bought ${n} — a glass cannon's whole window fits inside Metal Skin's 5 seconds.` },
    { item: 'Bullet Resilience', pts: 2, why: (n) => `${n} is pure bullet damage; resist it permanently.` },
  ],
  'Intensifying Magazine': [
    { item: 'Metal Skin', pts: 3, why: (n) => `They bought ${n} — a glass cannon's whole window fits inside Metal Skin's 5 seconds.` },
    { item: 'Bullet Resilience', pts: 2, why: (n) => `${n} is pure bullet damage; resist it permanently.` },
  ],
  Unstoppable: [
    { item: 'Slowing Bullets', pts: 2, why: () => "They bought Unstoppable — don't spend on CC they'll shrug off. Slows applied by bullets and raw damage are the honest answer." },
    { item: 'Inhibitor', pts: 1, why: () => "Inhibitor's slow and damage cut aren't a stun — Unstoppable doesn't cleanse your problem away." },
  ],
  'Metal Skin': [
    { item: 'Decay', pts: 2, why: () => 'They bought Metal Skin — it blocks bullets, not spirit. Decay and spirit damage go straight through it.' },
    { item: 'Escalating Exposure', pts: 1, why: () => 'Spirit damage ignores Metal Skin entirely.' },
  ],
  Refresher: [
    { item: 'Cursed Relic', pts: 2, why: () => "They bought Refresher — two ults per fight. Cursed Relic's item-block stops the second one from ever being pressed." },
  ],
};

function applyItemEffects(data: GuideData, add: AddFn, enemyItems: string[]): void {
  enemyItems.forEach((name) => {
    const it = itemByName(data, name);
    if (!it) return;
    // Spirit-tagged items only count when they are Spirit-category items.
    it.tags.forEach((tag) => {
      if (tag === 'spirit' && it.category !== 'Spirit') return;
      (EFFECT_COUNTERS[tag] ?? []).forEach((c) => add(c.item, c.pts, c.why(name)));
    });
    (NAMED_ITEM_COUNTERS[name] ?? []).forEach((c) => add(c.item, c.pts, c.why(name)));
  });
}

function buildMatrixCtx(data: GuideData, enemyItems: string[]): MatrixCtx {
  const ctx: MatrixCtx = {
    sustain: [],
    gun: 0,
    spirit: 0,
    tank: 0,
    mobility: 0,
    unstoppable: enemyItems.indexOf('Unstoppable') !== -1,
    counterspell: enemyItems.indexOf('Counterspell') !== -1,
    metalSkin: enemyItems.indexOf('Metal Skin') !== -1,
    lockItems: enemyItems.filter((n) => n === 'Knockdown' || n === 'Cursed Relic'),
  };
  enemyItems.forEach((n) => {
    const it = itemByName(data, n);
    if (!it) return;
    if (it.tags.indexOf('heal') !== -1) ctx.sustain.push(n);
    if (it.category === 'Weapon') ctx.gun += 1;
    if (it.category === 'Spirit') ctx.spirit += 1;
    if (it.tags.indexOf('tank') !== -1) ctx.tank += 1;
    if (it.tags.indexOf('mobility') !== -1) ctx.mobility += 1;
  });
  return ctx;
}

function applyYourHero(data: GuideData, add: AddFn, youHero: Hero | null, enemyHero: Hero, youItems: string[]): void {
  if (!youHero) return;
  const yt = youHero.tags;
  const enemyTags = enemyHero.tags;
  if (yt.indexOf('gun') !== -1) {
    add('Toxic Bullets', 1, `As ${youHero.name}, your bullets apply it for free — no active slot spent.`);
    add('Slowing Bullets', 1, 'Your gun applies the slow on every hit.');
    add('Spirit Rend', 1, 'Your bullets do the shredding for your whole team.');
    add('Silencer', 1, "A gun hero's silence — no active slot needed.");
    add('Crippling Headshot', 1, 'Your aim turns headshots into anti-heal.');
  }
  if (yt.indexOf('spirit') !== -1) {
    add('Decay', 1, `As ${youHero.name}, your spirit scaling feeds Decay's damage.`);
    add('Escalating Exposure', 1, 'Your kit applies spirit hits constantly — Exposure stacks fast.');
    add('Silence Wave', 1, 'Spirit heroes get the most from an AoE silence.');
  }
  if (yt.indexOf('teamheal') !== -1) {
    add('Healbane', 1, "As the support, anti-heal is your job — your carry shouldn't have to buy it.");
    if (enemyTags.indexOf('burst') !== -1) {
      add('Divine Barrier', 2, 'Your job is the save: 600 Barrier plus a cleanse, cooldown halved on an ally.');
      add('Rescue Beam', 2, 'Pull your carry out of the dive and heal you both 20%.');
    }
  }
  if (yt.indexOf('tank') !== -1) {
    add('Colossus', 1, "You're the frontline — Colossus lets you hold the space through their spike.");
  }
  youItems.forEach((n) => {
    (data.upgrades[n] ?? []).forEach((up) =>
      add(up, 2, `You already own ${n} — ${up} is its natural step up, and the component cost is discounted.`),
    );
  });
}

/** At most two items per counter family in the shortlist; same-family extras only backfill. */
function pickDiverse(data: GuideData, rankedList: RankedPick[], max: number): RankedPick[] {
  const famCount: Record<string, number> = {};
  const picked: RankedPick[] = [];
  const deferred: RankedPick[] = [];
  rankedList.forEach((r) => {
    const fam = data.family[r.name] || r.name;
    if ((famCount[fam] || 0) < 2) {
      famCount[fam] = (famCount[fam] || 0) + 1;
      picked.push(r);
    } else {
      deferred.push(r);
    }
  });
  const out = picked.slice(0, max);
  for (let i = 0; out.length < max && i < deferred.length; i++) out.push(deferred[i]);
  return out;
}

function emptyResult(enemyHero: Hero | null, youHero: Hero | null, droppedUnknown: string[]): ScoreResult {
  return {
    enemyHero,
    youHero,
    picks: [],
    ranked: [],
    threatLabels: [],
    notes: [],
    droppedUnknown,
    topOverBudget: false,
    narrowed: false,
  };
}

function threatLabelsFor(enemyHero: Hero, threatSet: Record<string, boolean>): string[] {
  const tags = enemyHero.tags;
  const T = (t: string) => tags.indexOf(t) !== -1;
  const labels: string[] = [];
  if (T('heal') || threatSet.heal) labels.push('Sustain / healing');
  if (T('gun') || threatSet.gun) labels.push('Gun damage');
  if (T('spirit') || threatSet.spirit) labels.push('Spirit damage');
  if (T('cc') || threatSet.cc) labels.push('Crowd control');
  if (T('air')) labels.push('Airborne');
  if (T('stealth') || threatSet.stealth) labels.push('Stealth');
  if (T('mobile') || threatSet.mobility) labels.push('Mobility');
  if (T('tank') || threatSet.tank) labels.push('Tanky');
  if (T('channel')) labels.push('Channelled ult');
  if (threatSet.antiheal) labels.push('Cuts your healing');
  return labels;
}

function sharedNotes(
  enemyHero: Hero,
  enemyItems: string[],
  youItems: string[],
  threatSet: Record<string, boolean>,
): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const ownedAntiheal = ['Toxic Bullets', 'Decay', 'Healbane', 'Spirit Burn', 'Crippling Headshot'].filter(
    (n) => youItems.indexOf(n) !== -1,
  );
  const T = (t: string) => enemyHero.tags.indexOf(t) !== -1;
  if (ownedAntiheal.length && (T('heal') || T('teamheal') || threatSet.heal)) {
    notes.push({
      kind: 'antiheal-owned',
      text: `You already own ${ownedAntiheal.join(', ')}. Anti-heal doesn't stack cleanly — Healbane's stacks were nerfed on 4 Nov — so your next souls are better spent on the resists or CC answers above than on a second anti-heal item.`,
    });
  }
  if (enemyItems.indexOf('Healbane') !== -1 && youItems.indexOf('Healbane') !== -1) {
    notes.push({
      kind: 'healbane-both',
      text: 'Healbane on both sides: theirs cuts your healing, yours cuts theirs — but stacking more anti-heal has hard diminishing returns since 4 Nov (Valve: 2 stacks ≈54.7%, 4 stacks ≈72%). Spend elsewhere.',
    });
  }
  if (T('stealth') || threatSet.stealth) {
    notes.push({
      kind: 'stealth-gap',
      text: 'Stealth gap — stated plainly: no reveal / true-sight counter-buy item was found in any pro source checked (Handbook, Item Builder, Wiki, guides). Stealthed heroes are partially visible to close enemies, and taking damage reveals Haze for 1.5s — that\'s the whole answer the pros have. Nothing above is sold as a reveal item.',
    });
  }
  return notes;
}

/** Full build: enemy hero + their items, your hero + your items. */
export function scoreFull(data: GuideData, input: FullInput): ScoreResult {
  const enemyHero = heroByName(data, input.enemyHero);
  const youHero = heroByName(data, input.youHero);
  const droppedUnknown: string[] = [];
  if (input.enemyHero && !enemyHero) droppedUnknown.push(input.enemyHero);
  if (input.youHero && !youHero) droppedUnknown.push(input.youHero);
  const enemyItems = input.enemyItems.filter((n) => {
    if (!itemByName(data, n)) {
      droppedUnknown.push(n);
      return false;
    }
    return true;
  });
  const youItems = input.youItems.filter((n) => {
    if (!itemByName(data, n)) {
      droppedUnknown.push(n);
      return false;
    }
    return true;
  });
  if (!enemyHero) return emptyResult(null, youHero, droppedUnknown);

  const scorer = createScorer(data);
  const { add } = scorer;
  applySignature(data, add, enemyHero);
  applyHeroKit(add, enemyHero);
  applyProMatrix(add, buildMatrixCtx(data, enemyItems));
  applyItemEffects(data, add, enemyItems);
  applyYourHero(data, add, youHero, enemyHero, youItems);

  const threatSet: Record<string, boolean> = {};
  enemyItems.forEach((n) => {
    const it = itemByName(data, n);
    if (it) it.tags.forEach((t) => {
      threatSet[t] = true;
    });
  });

  const ranked = toRanked(data, scorer).filter((r) => youItems.indexOf(r.name) === -1);
  const budget = input.budget ?? 0;
  const inBudget = budget ? ranked.filter((r) => r.info.cost <= budget) : ranked;
  const firstPick = inBudget.length ? inBudget[0] : ranked[0];
  const picks = firstPick
    ? pickDiverse(data, [firstPick].concat(ranked.filter((r) => r !== firstPick)), 5)
    : [];
  return {
    enemyHero,
    youHero,
    picks,
    ranked,
    threatLabels: threatLabelsFor(enemyHero, threatSet),
    notes: sharedNotes(enemyHero, enemyItems, youItems, threatSet),
    droppedUnknown,
    topOverBudget: Boolean(budget && firstPick && firstPick.info.cost > budget),
    narrowed: false,
  };
}

/** Quick pick: enemy hero + the item type they're buying + the type you want to buy. */
export function scoreQuick(data: GuideData, input: QuickInput): ScoreResult {
  const enemyHero = heroByName(data, input.enemyHero);
  const droppedUnknown: string[] = [];
  if (input.enemyHero && !enemyHero) droppedUnknown.push(input.enemyHero);
  if (!enemyHero) return emptyResult(null, null, droppedUnknown);

  const scorer = createScorer(data);
  const { add } = scorer;
  applySignature(data, add, enemyHero);
  applyHeroKit(add, enemyHero);
  if (input.enemyType === 'Weapon') {
    applyProMatrix(add, { sustain: [], gun: 1, spirit: 0, tank: 0, mobility: 0, unstoppable: false, counterspell: false, metalSkin: false, lockItems: [] });
  } else if (input.enemyType === 'Vitality') {
    applyProMatrix(add, { sustain: ['their health/sustain items'], gun: 0, spirit: 0, tank: 1, mobility: 0, unstoppable: false, counterspell: false, metalSkin: false, lockItems: [] });
  } else if (input.enemyType === 'Spirit') {
    applyProMatrix(add, { sustain: [], gun: 0, spirit: 1, tank: 0, mobility: 0, unstoppable: false, counterspell: false, metalSkin: false, lockItems: [] });
  }

  const ranked = toRanked(data, scorer);
  const tags = enemyHero.tags;
  const T = (t: string) => tags.indexOf(t) !== -1;
  const labels: string[] = [];
  if (T('heal')) labels.push('Sustain / healing');
  if (T('teamheal')) labels.push('Team healing');
  if (T('gun')) labels.push('Gun damage');
  if (T('spirit')) labels.push('Spirit damage');
  if (T('cc')) labels.push('Crowd control');
  if (T('air')) labels.push('Airborne');
  if (T('stealth')) labels.push('Stealth');
  if (T('mobile')) labels.push('Mobility');
  if (T('tank')) labels.push('Tanky');
  if (T('channel')) labels.push('Channelled ult');
  if (input.enemyType) labels.push(`Buying: ${typeDisplayName(input.enemyType)} items`);

  let pool = ranked;
  let narrowed = false;
  if (input.youType) {
    const filtered = ranked.filter((r) => r.info.cat === input.youType);
    if (filtered.length) {
      pool = filtered;
      narrowed = true;
    }
  }
  return {
    enemyHero,
    youHero: null,
    picks: pickDiverse(data, pool, 4),
    ranked,
    threatLabels: labels,
    notes: sharedNotes(enemyHero, [], [], Object.fromEntries(tags.map((t) => [t, true]))),
    droppedUnknown,
    topOverBudget: false,
    narrowed,
  };
}

/** Counter sheet: enemy hero only — top 3 counter buys with reasons. */
export function scoreCounterSheet(data: GuideData, enemyHeroName: string | null): ScoreResult {
  const result = scoreQuick(data, { enemyHero: enemyHeroName, enemyType: '', youType: '' });
  return { ...result, picks: result.picks.slice(0, 3) };
}

export function deliverLabel(deliver: string): string {
  if (deliver === 'gun') return 'Applied by your bullets';
  if (deliver === 'spirit') return 'Scales with your spirit';
  if (deliver === 'active') return 'Active item';
  return 'Passive';
}

export function typeDisplayName(cat: string): string {
  if (cat === 'Weapon') return 'Gun';
  if (cat === 'Vitality') return 'Health';
  return 'Spirit';
}
