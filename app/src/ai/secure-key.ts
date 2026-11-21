// Secure storage for the user's own AI API key — one tiny wrapper so
// no other file ever touches SecureStore (or the key name) directly.
//
// Native: expo-secure-store — encrypted at rest, iOS keychain /
// Android keystore. Values are strings only and capped at ~2 KB, which
// is plenty for an API key. Web has no SecureStore, so web builds fall
// back to sessionStorage (dev-only: the app is an Android app first;
// sessionStorage at least never persists the key to disk).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY_ITEM = 'dcb.ai.key';

const isWeb = Platform.OS === 'web';

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (isWeb) {
    sessionStorage.setItem(KEY_ITEM, trimmed);
    return;
  }
  await SecureStore.setItemAsync(KEY_ITEM, trimmed);
}

export async function loadApiKey(): Promise<string | null> {
  if (isWeb) {
    return sessionStorage.getItem(KEY_ITEM);
  }
  return SecureStore.getItemAsync(KEY_ITEM);
}

export async function hasApiKey(): Promise<boolean> {
  return (await loadApiKey()) != null;
}

export async function deleteApiKey(): Promise<void> {
  if (isWeb) {
    sessionStorage.removeItem(KEY_ITEM);
    return;
  }
  await SecureStore.deleteItemAsync(KEY_ITEM);
}
