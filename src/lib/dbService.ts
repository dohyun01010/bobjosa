import { DEFAULT_RESTAURANTS } from '../constants';
import { Restaurant, MenuItem } from '../types';

const LOCAL_RESTAURANTS_KEY = 'bobjosa_restaurants_server_master_v1';

export function getLocalCachedRestaurants(): Restaurant[] {
  if (typeof window === 'undefined') return DEFAULT_RESTAURANTS;
  try {
    const cached = localStorage.getItem(LOCAL_RESTAURANTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse local cached restaurants:', e);
  }
  return DEFAULT_RESTAURANTS;
}

export function setLocalCachedRestaurants(restaurants: Restaurant[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_RESTAURANTS_KEY, JSON.stringify(restaurants));
  } catch (e) {
    console.error('Failed to cache restaurants locally:', e);
  }
}

/**
 * Fetch from permanent Server Database API (/api/restaurants).
 * Restores added menu items even after local cache is 100% cleared!
 */
export async function fetchRestaurantsFromDb(): Promise<Restaurant[]> {
  const localData = getLocalCachedRestaurants();
  try {
    const res = await fetch('/api/restaurants', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
        setLocalCachedRestaurants(data.restaurants);
        return data.restaurants;
      }
    }
  } catch (e) {
    console.warn('Server DB fetch notice, using local cache fallback:', e);
  }
  return localData;
}

export function subscribeRestaurantsDb(
  onUpdate: (restaurants: Restaurant[]) => void
): () => void {
  // Polling server DB every 5 seconds for real-time synchronization across windows/devices
  if (typeof window === 'undefined') return () => {};

  const intervalId = setInterval(async () => {
    try {
      const res = await fetch('/api/restaurants', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
          setLocalCachedRestaurants(data.restaurants);
          onUpdate(data.restaurants);
        }
      }
    } catch {}
  }, 5000);

  return () => clearInterval(intervalId);
}

/**
 * Save restaurant updates to Server DB (/api/restaurants) and local cache instantly
 */
export async function saveRestaurantsToDb(restaurants: Restaurant[]): Promise<Restaurant[]> {
  // 1. Instant local cache update (0ms delay)
  setLocalCachedRestaurants(restaurants);

  // 2. Commit to Server Permanent DB
  try {
    await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurants }),
    });
  } catch (e) {
    console.warn('Failed to commit to Server DB:', e);
  }

  return restaurants;
}

export async function addMenuItemToDb(
  restaurantId: string,
  newMenuItem: MenuItem,
  currentRestaurants: Restaurant[]
): Promise<Restaurant[]> {
  const updatedRestaurants = currentRestaurants.map(r => {
    if (r.id !== restaurantId) return r;
    const exists = r.menuItems.some(
      m => m.name.toLowerCase() === newMenuItem.name.toLowerCase()
    );
    if (exists) return r;
    return {
      ...r,
      menuItems: [...r.menuItems, newMenuItem],
    };
  });

  await saveRestaurantsToDb(updatedRestaurants);
  return updatedRestaurants;
}

export async function addAliasToMenuItemDb(
  restaurantId: string,
  menuId: string,
  newAlias: string,
  currentRestaurants: Restaurant[]
): Promise<Restaurant[]> {
  const updatedRestaurants = currentRestaurants.map(r => {
    if (r.id !== restaurantId) return r;
    return {
      ...r,
      menuItems: r.menuItems.map(m => {
        if (m.id !== menuId) return m;
        const normAlias = newAlias.trim();
        if (m.aliases.includes(normAlias) || m.name === normAlias) return m;
        return {
          ...m,
          aliases: [...m.aliases, normAlias],
        };
      }),
    };
  });

  await saveRestaurantsToDb(updatedRestaurants);
  return updatedRestaurants;
}
