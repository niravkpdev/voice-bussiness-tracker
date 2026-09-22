/**
 * Storefront SessionStorage Caching Wrapper for Supabase Requests
 * Caches responses for 5 minutes (300,000 ms) so page reloads and tab navigations
 * do not re-trigger unnecessary Supabase API calls.
 */

export const MENU_CACHE_PREFIX = 'trinetr_storefront_menu_';
export const DEFAULT_MENU_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Safely reads from sessionStorage with TTL check.
 * @param {string} key 
 * @returns {any|null}
 */
export function getCachedData(key) {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Check expiration timestamp
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
      return parsed.data;
    }

    // Expired - remove from storage
    window.sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely writes to sessionStorage with an expiration timestamp.
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlMs 
 */
export function setCachedData(key, data, ttlMs = DEFAULT_MENU_CACHE_TTL_MS) {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  try {
    const payload = {
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
      data,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // QuotaExceededError or private browsing restriction
    console.warn('Failed to cache data in sessionStorage:', err);
  }
}

/**
 * Executes a Supabase request with sessionStorage caching.
 * @param {string} cacheKey 
 * @param {Function} fetcher 
 * @param {number} ttlMs 
 * @param {boolean} forceRefresh 
 * @returns {Promise<any>}
 */
export async function cachedSupabaseRequest(cacheKey, fetcher, ttlMs = DEFAULT_MENU_CACHE_TTL_MS, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  const freshData = await fetcher();
  if (freshData !== undefined && freshData !== null) {
    setCachedData(cacheKey, freshData, ttlMs);
  }
  return freshData;
}

/**
 * Clears all cached storefront menu items from sessionStorage.
 */
export function clearStorefrontMenuCache() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(MENU_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}
