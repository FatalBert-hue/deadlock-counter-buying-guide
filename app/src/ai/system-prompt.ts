// System prompt for the AI chat helper, built from the bundled guide
// data (src/data) so the AI answers from DCB's own knowledge, not
// from whatever it half-remembers about Deadlock.
//
// Kept compact on purpose: hero names + roles, item names + tiers,
// and each hero's top 2 pro counter picks (names only, no long reason
// strings). Roughly 2,500 tokens — small next to a Flash model's
// context window, and cheap on the user's own key.
//
// The prompt's guardrails: Deadlock only (politely decline anything
// else), only real heroes/items from the lists below — never invent
// one — and short, practical answers.
import { guideData } from '@/data';

const TEST_SYSTEM_PROMPT = 'You are a test. Reply with just the word OK and nothing else.';

export function buildTestSystemPrompt(): string {
  return TEST_SYSTEM_PROMPT;
}

export function buildSystemPrompt(): string {
  const heroes = guideData.heroes.map((h) => `${h.name} (${h.role})`).join(', ');

  const byCategory = new Map<string, string[]>();
  for (const item of guideData.items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(`${item.name} (T${item.tier})`);
    byCategory.set(item.category, list);
  }
  const items = [...byCategory.entries()]
    .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
    .join('\n');

  // Top 2 pro counter picks per hero, by confidence — names only.
  const proPicks = Object.entries(guideData.proKit)
    .map(([hero, picks]) => {
      const top = [...picks].sort((a, b) => b[1] - a[1]).slice(0, 2);
      return `vs ${hero}: ${top.map(([item]) => item).join(', ')}`;
    })
    .join('\n');

  return [
    `You are DCB's Deadlock companion — a helpful assistant inside the DCB counter-buy app.`,
    `Current patch: ${guideData.patch}. There are ${guideData.heroes.length} heroes and ${guideData.items.length} items in the game.`,
    ``,
    `HEROES (only these exist — never name any other hero): ${heroes}`,
    ``,
    `ITEMS (only these exist — never name any other item):`,
    items,
    ``,
    `PRO COUNTER PICKS (what the pros buy — lean on these first):`,
    proPicks,
    ``,
    `RULES:`,
    `1. Answer ONLY about Deadlock — heroes, items, builds, counter-buys, and how the game plays. If asked about anything else, politely decline in one sentence and offer a Deadlock question instead.`,
    `2. Only ever name heroes and items from the lists above. If you are not sure an item or hero is real, say so instead of guessing.`,
    `3. Keep answers short and practical — a few sentences, or a short list. Name the items, say why in one line each.`,
    `4. When asked what to buy against a hero or an item, prefer the pro counter picks above.`,
    `5. If the player describes how a match is going, suggest the next 1-3 items to buy and why.`,
    `6. Never claim to be Valve, the game, or an official source. This is an unofficial fan companion.`,
  ].join('\n');
}
