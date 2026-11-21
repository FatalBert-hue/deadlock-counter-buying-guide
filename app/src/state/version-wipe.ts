// Wipes ALL of the app's AsyncStorage data whenever the installed app
// version changes — and on a fresh install, which has no stamp yet.
//
// Why: saved builds, favourites, settings and the cached guide data live
// in AsyncStorage, and Android keeps that data across an APK update. So a
// new APK used to open with the previous version's builds already in it.
// Mikel wants every new version to start completely clean instead.
//
// Mechanism: on startup, before any provider mounts (see RootLayout in
// src/app/_layout.tsx), compare the running version — app.json `version`
// plus the native build number — against a stamp stored in AsyncStorage.
// If they differ, `AsyncStorage.clear()` removes everything the app ever
// stored, then the new stamp is written. Same version = no wipe.
//
// The guide data itself is bundled in the app, so it keeps working after
// a wipe; only the cached remote copy (if any) is dropped and re-fetched.
//
// This never blocks startup: any failure reading the stamp, clearing, or
// writing the stamp is swallowed and the app starts normally. If the
// clear itself fails, the stamp is deliberately NOT written, so the wipe
// is retried on the next launch.
//
// Consequence to be aware of: a user's own saved builds, favourites and
// settings are wiped too on every version update. Export a build as a
// file first if it needs to survive an update.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const VERSION_STAMP_KEY = 'counter-buy:version-stamp:v1';

/**
 * TESTING ONLY — delete / set to false for the production release.
 * While true, every new app version wipes all stored data (saved builds,
 * favourites, settings) on first launch. That is what Mikel wants while
 * he and Dad are testing, so a fresh APK never opens with a previous
 * version's builds in it. For the real release this MUST be off, or
 * real users would lose their builds on every update. The wipe lives
 * entirely behind this one flag: turn it off here and nothing is wiped
 * (the version stamp is simply not checked).
 */
export const WIPE_ON_VERSION_CHANGE_FOR_TESTING = true;

export type VersionWipeStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'clear'>;

/** "0.1.6+7" style stamp for the running build, or null if unknown. */
export function currentAppVersion(): string | null {
  const version = Constants.expoConfig?.version;
  if (!version) return null;
  const build =
    Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber;
  return build !== undefined && build !== null ? `${version}+${build}` : version;
}

/**
 * Wipe all AsyncStorage data if the running version differs from the
 * stored stamp. Returns true when a wipe happened. Never throws.
 * `deps` exists so the logic can be tested without the real storage.
 */
export async function wipeIfVersionChanged(
  deps: { storage?: VersionWipeStorage; version?: string | null } = {},
): Promise<boolean> {
  // TESTING ONLY (see WIPE_ON_VERSION_CHANGE_FOR_TESTING above): off
  // means no wipe ever happens and no stamp is read or written.
  if (!WIPE_ON_VERSION_CHANGE_FOR_TESTING) return false;
  const storage = deps.storage ?? AsyncStorage;
  const version = deps.version !== undefined ? deps.version : currentAppVersion();
  if (!version) return false;
  try {
    const stored = await storage.getItem(VERSION_STAMP_KEY);
    if (stored === version) return false;
    try {
      await storage.clear();
    } catch {
      // Clear failed: do not write the stamp, so the wipe is retried
      // on the next launch instead of pretending it happened.
      return false;
    }
    try {
      await storage.setItem(VERSION_STAMP_KEY, version);
    } catch {
      // Stamp write failed; the data is already gone, so the next
      // launch will just wipe an already-empty store again.
    }
    return true;
  } catch {
    return false;
  }
}
