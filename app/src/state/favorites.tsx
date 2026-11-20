// Favourites — heroes and items the user starred in the pickers.
// Favourited heroes pin to the top of the hero picker, favourited items
// pin to the top of the item picker (within their category tab).
// Persisted locally in AsyncStorage; no accounts, no uploads.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { guideData } from '@/data';

const STORAGE_KEY = 'counter-buy:favorites:v1';

interface Favorites {
  heroes: string[];
  items: string[];
}

const EMPTY: Favorites = { heroes: [], items: [] };

interface FavoritesContextValue {
  favoriteHeroes: string[];
  favoriteItems: string[];
  isHeroFavorite: (name: string) => boolean;
  isItemFavorite: (name: string) => boolean;
  toggleHero: (name: string) => void;
  toggleItem: (name: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteHeroes: [],
  favoriteItems: [],
  isHeroFavorite: () => false,
  isItemFavorite: () => false,
  toggleHero: () => {},
  toggleItem: () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorites>(EMPTY);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Favorites>;
        const heroNames = new Set(guideData.heroes.map((h) => h.name));
        const itemNames = new Set(guideData.items.map((i) => i.name));
        setFavorites({
          heroes: Array.isArray(parsed.heroes) ? parsed.heroes.filter((n) => heroNames.has(n)) : [],
          items: Array.isArray(parsed.items) ? parsed.items.filter((n) => itemNames.has(n)) : [],
        });
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: Favorites) => {
    setFavorites(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggle = useCallback(
    (kind: 'heroes' | 'items', name: string) => {
      const list = favorites[kind];
      const next = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
      persist({ ...favorites, [kind]: next });
    },
    [favorites, persist],
  );

  const toggleHero = useCallback((name: string) => toggle('heroes', name), [toggle]);
  const toggleItem = useCallback((name: string) => toggle('items', name), [toggle]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteHeroes: favorites.heroes,
      favoriteItems: favorites.items,
      isHeroFavorite: (name: string) => favorites.heroes.includes(name),
      isItemFavorite: (name: string) => favorites.items.includes(name),
      toggleHero,
      toggleItem,
    }),
    [favorites, toggleHero, toggleItem],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext);
}
