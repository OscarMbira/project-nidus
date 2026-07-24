/**
 * Sidebar menu localStorage cache helpers (v675 revamp).
 *
 * Strategy: stale-while-revalidate.
 *   - Fresh  (<10 min): serve immediately, skip DB fetch entirely.
 *   - Stale  (>10 min): serve immediately, refresh in background.
 *   - Miss             : show skeleton, fetch from DB, write cache.
 *
 * Cache is partitioned by auth user ID AND layout scope (pm / pmo / tm) so
 * dual-role users never see a PMO sidebar on /pm/* routes (or vice versa).
 *
 * Cache is invalidated on SIGNED_OUT and on explicit refetch().
 */

const SIDEBAR_CACHE_VERSION = 36
const SIDEBAR_CACHE_TTL_MS  = 10 * 60 * 1000   // 10 minutes — fresh window
const SIDEBAR_CACHE_KEY     = (uid, layoutScope) => `nidus_sidebar_v7_${uid}_${layoutScope}`

// ---------------------------------------------------------------------------
// Platform sidebar cache
// ---------------------------------------------------------------------------

/** Read a cached sidebar entry for the given auth user ID and layout scope. */
export function readSidebarCache(userId, layoutScope) {
  if (!userId || !layoutScope) return null
  try {
    const raw = localStorage.getItem(SIDEBAR_CACHE_KEY(userId, layoutScope))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (entry?.version !== SIDEBAR_CACHE_VERSION) return null
    if (!entry?.cachedAt || !Array.isArray(entry?.items)) return null
    if (entry?.layoutScope && entry.layoutScope !== layoutScope) return null
    return entry
  } catch {
    return null
  }
}

/** Write a sidebar cache entry for the given auth user ID and layout scope. */
export function writeSidebarCache(userId, layoutScope, { items, rawHierarchy, layoutHint }) {
  if (!userId || !layoutScope) return
  try {
    const entry = {
      version: SIDEBAR_CACHE_VERSION,
      layoutScope,
      cachedAt: Date.now(),
      items:        items        ?? [],
      rawHierarchy: rawHierarchy ?? [],
      layoutHint:   layoutHint   ?? null,
    }
    localStorage.setItem(SIDEBAR_CACHE_KEY(userId, layoutScope), JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — ignore; next load just fetches from DB.
  }
}

/** Remove sidebar cache for a user (all scopes), one scope, or legacy keys. */
export function clearSidebarCache(userId, layoutScope = null) {
  try {
    if (userId && layoutScope) {
      localStorage.removeItem(SIDEBAR_CACHE_KEY(userId, layoutScope))
      return
    }
    if (userId) {
      const prefixes = [
        `nidus_sidebar_v7_${userId}_`,
        `nidus_sidebar_v5_${userId}_`,
        `nidus_sidebar_v4_${userId}`,
        `nidus_sidebar_v3_${userId}`,
        `nidus_sidebar_v2_${userId}`,
      ]
      const toRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (prefixes.some((p) => key === p || key.startsWith(p))) {
          toRemove.push(key)
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
      return
    }
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key?.startsWith('nidus_sidebar_v2_') ||
        key?.startsWith('nidus_sidebar_v3_') ||
        key?.startsWith('nidus_sidebar_v4_') ||
        key?.startsWith('nidus_sidebar_v5_') ||
        key?.startsWith('nidus_sidebar_v7_')
      ) {
        toRemove.push(key)
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

/** True when the cache entry is still within the fresh window. */
export function isSidebarCacheFresh(entry) {
  if (!entry?.cachedAt) return false
  return Date.now() - entry.cachedAt < SIDEBAR_CACHE_TTL_MS
}

// ---------------------------------------------------------------------------
// Legacy cleanup – removes old nidus_menu_*, nidus_sim_menu_*, and v2–v4 keys.
// Called once on mount by useMenu / useSimMenu to sweep all browsers clean.
// ---------------------------------------------------------------------------

const LEGACY_PREFIXES = [
  'nidus_menu_',
  'nidus_sim_menu_',
  'nidus_sidebar_v2_',
  'nidus_sidebar_v3_',
  'nidus_sidebar_v4_',
]

function collectAllLegacyKeys(storage) {
  const keys = []
  if (!storage) return keys
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) keys.push(key)
    }
  } catch {
    // ignore
  }
  return keys
}

/** Remove ALL legacy sidebar cache entries (v1–v4, nidus_menu_*) from browser storage. */
export function purgeAllSidebarMenuCaches() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of collectAllLegacyKeys(storage)) {
      try { storage.removeItem(key) } catch { /* ignore */ }
    }
  }
}
