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

// Bumped 38 → v805 added plat_tpl_organisational/sim_tpl_organisational under the
// Templates section; without a version bump, anyone with an already-cached sidebar
// tree (up to 10 min old per the TTL below) would keep seeing the pre-v805 shape
// until it happened to expire.
// Bumped 48 → 49: Manage Roles (v902/v905) must appear for PMO + manager creator tiers.
// Bumped 49 → 50: Manage Menu Bundles (v914/v916/v917) must appear for the same tiers.
// Bumped 50 → 51: fixed a bug where the fast cache-read path recomputed the sidebar from
// rawHierarchy (skipping v930's pack-grouping step) instead of using the already-grouped
// `items` the cache stores — force a clean re-write so no browser keeps replaying the old,
// buggy read behaviour's output shape.
// Bumped 51 → 52: fixed fetchRoleMenuRowsForRoles() silently truncating role_menu_items at
// PostgREST's default row cap (no pagination) once an account's role grants passed ~1000 rows —
// any cache written before this fix has an incomplete menu baked in, even though the fix itself
// doesn't change the cache's shape.
// Bumped 52 → 53: v963a deactivates the broken Procurement stub menu_items rows — any cache
// written before this migration ran still has them baked in.
// Bumped 53 → 54: v964c adds the new "Approvals Register" menu item.
// Bumped 54 → 55 (2026-08-24): Phase 14 — Milestones (SQL/v966am, under sim_pm_ctrl_core) and
// Governance Actions Register (SQL/v966an, under Practice Workflows & Governance via a new
// inferSimPmoCategoryId regex branch) wired into the Simulator sidebar for the first time.
// Bumped 55 → 56 (2026-08-25): groupMenuTreeByIndustryPack() now labels the PMO-scope top-level
// wrapper "PMO Workspace" instead of sharing "Core Project Management" with the PM-scope wrapper
// (same fix applied on the Platform side) — any cache written before this ran still shows the
// old shared label.
// Bumped 56 → 57 (2026-08-29): v982 Phase 7 — Main Application Zones (Simulator mirror of the
// Platform-side bump). Defensive bump, not a cache-shape change: Sidebar.jsx now renders a My
// Work / Delivery / Organisation ZoneTabs bar above the existing menu tree, purely derived from
// location.pathname + the already-resolved layoutHint.layout — no changes to
// reorganizeMenuRoots()/groupMenuTreeByIndustryPack() or any function whose output this cache
// actually stores. Bumped anyway per this codebase's own established convention for any change
// touching Sidebar.jsx's rendered output.
// 57->58 (2026-09-03): real fix in reorganizeMenuRoots() (Platform-side bump, same fix) — plat_*
// top-level orphan categories could leak into Simulator's 'sim_pmo'/'sim_pm' layouts for any role
// holding both plat_* and sim_* grants; the sweep had zero exclusion for those layouts before this
// fix. Also excludes sim_* orphans from ever leaking into a Platform layout (the bug that was
// actually observed — "[P] Practice – Standards-Based" inside Platform's Organisation zone).
// Bumped for v1002 FIN Testing Strategy + Sanity Checks wire-up.
// Bumped for v1003 FIN Dress Rehearsal Strategy.
// Bumped for v1004 FIN Dress Rehearsal Strategy hard fix.
// Bumped for v1010 project-level industry classification — pm/tm-layout sidebars now
// restrict industry pack sections to the assigned project(s)' industries.
// Bumped for v1024 Scope & Deliverables taxonomy group.
// Bumped 2026-09-10: pm/tm-layout industry pack sections now scope to the CURRENTLY OPEN
// project's own industry only (not the union across every project the user manages), and
// getMenuItemIndustryPackMap's menuCodeToPack is now built from every account-enabled industry
// so an excluded pack's items are correctly dropped instead of leaking into Core Project
// Management (mirrors the Platform fix — see apps/platform's menuCacheUtils.js history).
// 65->66 (2026-09-17): force cache refresh after v1067 project-industry backfill; pm/tm
// pack sections use only the open project's industry_category_id (no account fallback).
// 66->67 (2026-09-17): fix Banking pack missing when project industry is set (mirrors Platform
// cache v117 — CurrentProjectProvider wraps MenuProvider + regroup on first projectId).
// 67->68 (2026-09-26): v1113 Risk Categories catalogue.
// 68->69 (2026-09-26): pm/tm with no project industries now shows the organisation's
// account_industries packs. A cached Core+Platform-only tree must not be reused.
// 69->70 (2026-10-04): restore practice Project Manager pack grouping.
// 70->71 (2026-10-04): keep DB taxonomy sections on the practice Project Manager sidebar.
// 71->72 (2026-10-04): restore Platform and industry-pack sections on the practice sidebar.
// 72->73 (2026-10-04): practice Project Manager sidebar has no methodology track sections.
const SIDEBAR_CACHE_VERSION = 73
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
        `nidus_sidebar_v6_${userId}_`,
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
        key?.startsWith('nidus_sidebar_v6_') ||
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
