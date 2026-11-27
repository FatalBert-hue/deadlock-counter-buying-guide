// Relevant game data for the AI chat — the app hands the model the
// counter-buy information it needs for THIS question, instead of the
// model guessing from training data.
//
// The always-on system prompt (system-prompt.ts) already carries the
// compact pack — hero names + roles, item names + tiers, top-2 pro
// picks per hero. This module adds the detail for the heroes and
// items actually named in the user's latest message:
//   - hero: role, class, note, and the full pro counter picks with
//     their reasons (top 4 by confidence)
//   - item: tier, category, souls cost, in-game description, and
//     the guide's counter-buy note when the item is a counter pick
//
// Names are matched case-insensitively: multi-word names by
// substring, single-word names by whole word (so "remember" never
// matches the hero Rem). Multi-word heroes also match on a
// distinctive last word (Geist, Talon, Harrow, Doorman, Danny,
// Krill). Capped at 4 heroes and 6 items so the block stays small
// — a few hundred tokens, not the whole database on every message.
// When nothing is named, this returns '' and the compact system
// prompt carries the question on its own.
import { guideData, type Hero, type Item } from '@/data';

const MAX_HEROES = 4;
const MAX_ITEMS = 6;
const MAX_PICKS_PER_HERO = 4;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `word` appears as a whole word in `text`. */
function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(text);
}

/** True when `name` is mentioned: multi-word names by substring,
    single-word names by whole word. */
function nameMentioned(text: string, name: string): boolean {
  return name.includes(' ') ? text.toLowerCase().includes(name.toLowerCase()) : containsWord(text, name);
}

function matchedHeroes(text: string): Hero[] {
  const found: Hero[] = [];
  for (const hero of guideData.heroes) {
    if (found.length >= MAX_HEROES) break;
    let matched = nameMentioned(text, hero.name);
    if (!matched) {
      // Distinctive last word: "Geist" for Lady Geist, "Krill" for
      // Mo & Krill. Short/common last words ("King") are not used.
      const parts = hero.name.split(/\s+/);
      const last = parts[parts.length - 1];
      if (parts.length > 1 && last.length >= 5 && containsWord(text, last)) matched = true;
    }
    if (matched) found.push(hero);
  }
  return found;
}

function matchedItems(text: string): Item[] {
  const found: Item[] = [];
  for (const item of guideData.items) {
    if (found.length >= MAX_ITEMS) break;
    if (nameMentioned(text, item.name)) found.push(item);
  }
  return found;
}

function heroBlock(hero: Hero): string {
  const lines = [`vs ${hero.name} (${hero.role}, ${hero.cls}) — ${hero.note}`];
  const picks = [...(guideData.proKit[hero.name] ?? [])]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PICKS_PER_HERO);
  if (picks.length > 0) {
    lines.push('  Counter picks:');
    for (const [item, , reason] of picks) {
      lines.push(`  • ${item} — ${reason}`);
    }
  }
  return lines.join('\n');
}

function itemBlock(item: Item): string {
  const lines = [`• ${item.name} (Tier ${item.tier} ${item.category}, ${item.cost} souls) — ${item.desc ?? 'No description.'}`];
  const counter = guideData.counters[item.name];
  if (counter?.desc) {
    lines.push(`  Counter note: ${counter.desc}`);
  }
  return lines.join('\n');
}

/** The detail block for the heroes/items named in `userText`, or ''
    when none are named. */
export function buildRelevantGameData(userText: string): string {
  if (!userText.trim()) return '';
  const heroes = matchedHeroes(userText);
  const items = matchedItems(userText);
  if (heroes.length === 0 && items.length === 0) return '';
  const parts = [
    `RELEVANT GAME DATA — from the app's own counter-buy database (patch ${guideData.patch}). Use this as the source of truth for the heroes and items below; don't guess when the data answers the question. Ignore any entry that doesn't relate to the question.`,
    '',
  ];
  if (heroes.length > 0) {
    parts.push(...heroes.map(heroBlock), '');
  }
  if (items.length > 0) {
    parts.push('ITEMS:', ...items.map(itemBlock));
  }
  return parts.join('\n');
}
