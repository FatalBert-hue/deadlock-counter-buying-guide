# Deadlock mobile app — Phases 0, 1 & 2

Working title in code: **Counter Buy**. Final app name is NOT decided yet and
must NOT be "Deadlock Counter Buying Guide". Free, no ads, no in-app purchases,
no accounts, no logins, no AI, no backend. Rule-based only: pro counter-buy
rules first, item-effect algorithm second.

Data current to **Minor Update 11-26-2026** (posted 2026-11-26): 44 heroes,
156 items.

## Layout

- `pwa/` — **Phase 0, PWA safety net ($0).** A copy of the web guide
  (v0.8) made installable. The live site under
  `~/workspace/ts-spaces/deadlock-counter-buying-guide/` was NOT touched;
  only this copy was modified.
  - `index.html` — copy of the guide, plus manifest link, theme-color /
    description / Apple meta tags, and service-worker registration.
  - `manifest.webmanifest` — name "Counter Buy", standalone, dark theme.
  - `sw.js` — offline-first service worker, precaches 206 files
    (page + all hero/item images + icons).
  - `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — generated
    from the guide's `icon.webp` with PIL.
  - `assets/` — the 200 hero/item images, copied unchanged.
- `data/data.json` — **canonical extracted data** (version 1, patch
  "Minor Update 11-26-2026"): 44 heroes, 156 items, 59 counter entries,
  pro rules for all 44 heroes, signature picks for all 44, family map,
  upgrades. Extracted from the web guide's `index.html` with
  `/tmp/extract-data.js` (read-only parse of the page's data literals).
- `app/` — **Phase 1, Expo scaffold.** Created with
  `npx create-expo-app@latest app --template default@sdk-58`
  (Expo SDK 58, React Native 0.88.1, React 19.3.0, TypeScript).
  - Tabs (all placeholder screens with real navigation, real data counts,
    and the unofficial-fan disclaimer): Full build (`src/app/index.tsx`),
    Quick pick (`src/app/quick-pick.tsx`), Counter sheet
    (`src/app/counter-sheet.tsx`), Patch (`src/app/patch.tsx`),
    Saved builds (`src/app/saved.tsx`).
  - `src/data/index.ts` — typed import of the bundled data
    (`assets/data/data.json`, same file as `data/data.json`).
  - `src/data/images.ts` — generated static `require()` map for all 200
    images (Metro cannot use dynamic paths); every entry verified to exist.
  - `assets/images/heroes/` (44), `assets/images/items/` (156) — copied
    unchanged from the web guide.
  - `assets/data/data.json` — offline fallback copy of the data.
  - `@react-native-async-storage/async-storage` installed via
    `npx expo install` (for the Phase 2 data-update cache).
  - `app.json` — name "Counter Buy", slug `counter-buy`, version 0.1.0,
    dark splash/adaptive-icon background `#0a0c14`.

## Phase 2 — real app (built 2026-11-20)

- `app/src/engine/score.ts` — **pure TypeScript port of the web guide's
  scoring** (applySignature / applyProMatrix / applyHeroKit / pickDiverse /
  recommend / quickRecommend, plus the notes logic). Then the **item-effect
  algorithm**: every item's effects are inferred from its name, tags,
  category, cost and tier (healing, lifesteal, bullet resist, spirit
  resist, spirit power, bullet damage, fire rate, bullet shield, healing
  reduction, spirit shield, bullet velocity, mobility, slow, CC, silence,
  dispel, stamina, cooldown, reload, zoom, item slots, sustain, health
  regen, debuff resist, debuff duration, ammo, spirit lifesteal) and each
  candidate counter is scored against the enemy's actual items
  (e.g. healing/lifesteal → anti-heal, bullet resist → spirit damage,
  spirit power → spirit resist, mobility → slows/roots, CC → debuff
  reducers). Engine order: pro rules first, item-effect second.
  `scripts/engine-crosscheck.mjs` runs the real web code (with DOM stubs)
  against the TS engine: **18 cases, all match** — 12 Full-build
  (including Mina no items → Counterspell top; Mina Glass
  Cannon+Sharpshooter → Metal Skin top; Mina Boundless Spirit+Mystic
  Reverb → Spirit Resilience top; Victor Leech+Healing Tempo → Toxic
  Bullets top) and 6 Quick-pick (Abrams/Gun/Gun, Bebop/Health/Spirit,
  Calico/Gun/Spirit, Haze/Spirit/Weapon, Seven/Not sure/Not sure,
  Warden/Health/Health). One bug found and fixed during the check:
  `scoreQuick` referenced a removed `threatSet` variable.
- `app/src/state/` — providers: `settings.tsx` (theme dark/light/system,
  border accent, icon size, show/hide souls, AsyncStorage-persisted),
  `data.tsx` (bundled data first; on launch fetches versioned `data.json`
  from GitHub Pages, caches newer valid copies in AsyncStorage, falls
  back offline; unknown hero/item names dropped by the engine, never
  crash), `saved.tsx` (saved builds, AsyncStorage-persisted, shared JSON
  file format v1), `drawer.tsx` (side-menu open/close state),
  `index.tsx` (AppProviders wrapper).
- `app/src/components/` — `hero-picker.tsx` / `item-picker.tsx` (search +
  FlatList, portraits/icons, tier + cost, owned items marked "Owned" and
  unpickable), `slot-grid.tsx` (12 slots), `pick-card.tsx` (rank, name,
  category/tier/cost, reasons, confidence + sources for pro picks, "Top
  pick" highlight), `results.tsx` (threat chips, pick list, notes),
  `screen-header.tsx` (☰ menu button top-left + Settings), `screen-shell.tsx`
  (shared safe-area/scroll/intro/disclaimer shell — short one-line intro
  only, no long menu descriptions), `settings-modal.tsx` (theme, border
  accent swatches, icon size, souls toggle), `app-drawer.tsx` (slide-in
  side menu, **empty for now** — contents come later).
- Real screens (placeholders replaced): Full build (`src/app/index.tsx` —
  hero pickers, 12-slot grids, souls budget, save build), Quick pick
  (`quick-pick.tsx` — enemy hero + Gun/Health/Spirit dropdowns), Counter
  sheet (`counter-sheet.tsx` — enemy hero only, top 3), Patch (`patch.tsx`
  — patch label, data source, manual update check), Saved builds
  (`saved.tsx` — load into Full build, share via share sheet as
  `counter-buy-build-<name>.json`, import by opening a file, delete).
- `app/eas.json` — preview profile builds an Android APK
  (`distribution: internal`), production builds an app bundle.
  `app.json` gained `android.package: com.counterbuy.app` and
  `versionCode: 1`.
- Packages added via `npx expo install` (SDK 58 compatible):
  `expo-sharing`, `expo-document-picker`, `expo-file-system`.
- `app/src/data/images.ts` — `heroImage`/`itemImage` now return
  expo-image's `ImageSource` type (cast from the RN map type; values are
  require() assets, read-only at runtime).

## Verified on this machine (2026-11-20)

- PWA: served over local HTTP — `index.html`, `manifest.webmanifest`
  (served as `application/manifest+json`), `sw.js`, icons, hero/item
  images all 200; manifest parses as valid JSON; `sw.js` passes
  `node --check`. **Not verified:** real install prompt / offline launch
  in Chrome on a phone — no browser was available to this agent.
- Data: extraction counts 44 heroes / 156 items / 59 counters / pro rules
  for all 44 heroes; `data.json` re-parses cleanly.
- Expo: `npx expo export --platform web` succeeds — all five routes
  bundled (`index`, `quick-pick`, `counter-sheet`, `patch`, `saved`);
  bundles contain the screen copy and the patch label; the data (e.g.
  "Haze") is bundled. ESLint passes clean on all new/edited files.
- TypeScript: `npx tsc --noEmit` reports **3 errors, all pre-existing in
  the pristine SDK 58 template** (verified against a fresh scaffold):
  `animated-icon.web.tsx` CSS import, `app-tabs.web.tsx` TabButton ref
  typing, `theme.ts` global.css import. My files add zero new errors.
  (One more pre-existing ESLint error exists in the untouched template
  file `src/hooks/use-color-scheme.web.ts` — setState-in-effect in the
  hydration hook; Phase 2 does not use that hook.)
- Live site untouched: the web guide's `index.html` contains no manifest
  or service-worker references.
- **Not verified:** no Android Studio / emulator on this VM, so no
  Android build, no Expo Go run, and no on-device test. Node here is
  v24.22.1 (research said RN 0.88 wants Node 22.13+; v24 worked for the
  scaffold and the web export).

## Errors fixed along the way

- `/tmp` is a 512 MB tmpfs: a throwaway baseline scaffold filled it
  (ENOSPC). Deleted it; the baseline check was redone under
  `~/workspace/.baseline-tmp` and removed afterwards.
- `pkill -f "http.server …"` matched the agent's own shell and killed
  the test command; the servers themselves were verified stopped
  afterwards. (Use a PID file next time.)
- `npx expo lint` installs ESLint 9 then complains it needs ESLint
  8.57+ — a template tooling quirk. Ran `eslint` directly on the
  new/edited files instead: clean.

## Phase 2 still needs

1. **APK build (next):** Mikel signs in to Expo, then from
   `~/workspace/deadlock-app/app/`: `npx eas-cli@latest login` (his Expo
   account), `npx eas-cli@latest build --profile preview --platform android`
   — EAS builds the APK in the cloud, no Android Studio needed. Install
   the APK on the Pixel 8a and test: all five tabs, pickers, drawer,
   settings, saved-build share/import, offline (airplane mode).
2. **Google Play closed test (after the APK is proven):** Mikel sets up
   the Play developer account ($25 one-time), recruits 12+ testers for
   14 days of closed testing, then production.
3. Screenshot match-history scan is **v2, not v1** — do not build it yet.
4. Drawer contents — the drawer is an empty shell; contents come later.
5. No GitHub push was made from here (parent agent pushes).
