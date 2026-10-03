import { createContext, useContext, useState, useEffect, useRef, createElement } from 'react'
import { useLocation } from 'react-router-dom'
import { usePlatformProjectId } from './usePlatformProjectId'
import { platformDb } from '../services/supabaseClient'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { applySimulatorRegistryFallback } from '@nidus/config/menuRegistryUtils'
import { stripVirtualMenuItems } from '@nidus/config/menuDbOnlyUtils'
import {
  METHODOLOGY_TRACK_IDS,
  extractProjectIdFromPath,
  filterMenuByPmProfile,
  filterMenuTreeByVisibleTracks,
  readUserMethodologyPreference,
  resolvePmProfile,
  resolveVisibleTracks,
  roleNamesIncludeLearner,
  wrapPmoMenuWithMethodologyTracks,
} from '@nidus/config/methodologyMenuUtils'
import { filterExcludedPmoLayoutMenuItems } from '@nidus/config/pmoLayoutMenuExclusions.js'
import { dedupePmoMenuTree } from '@nidus/config/pmoMenuSemanticDedupe.js'
import { resolveBillingAccess } from '../services/billingAccessService.js'
import { getMenuItemIndustryPackMap, getProjectIndustryCategoryIds } from '../services/organisationIndustryService.js'
import { isPlatformBillingEnabled } from '@nidus/config/platformBillingFeatures.js'
import { applyBillingMenuPolicy } from '@nidus/shared/utils/billingMenuUtils.js'
import {
  clearSidebarCache,
  isSidebarCacheFresh,
  purgeAllSidebarMenuCaches,
  readSidebarCache,
  writeSidebarCache,
} from '@nidus/shared/utils/menuCacheUtils'
import {
  inferLayoutScopeFromPathname,
  filterRolesForLayout,
  menuStateKey,
  resolveLayoutType,
  resolveMenuLayoutScope,
  clearPersistedMenuLayoutScope,
  cacheUserMenuRoles,
  clearCachedUserMenuRoles,
  getCachedUserMenuRoles,
  fetchUserRoleNamesForAuthUser,
} from '@nidus/shared/utils/menuLayoutUtils'
import {
  applyCategorySortOrders,
  getCategoryMenuCodes,
  getTrackAnchorForLayout,
  applyCategoryPresentationLabels,
  applyPmLayoutSanitization,
  applyPmoSectionNesting,
  applyTrackCategoryPresentationLabels,
  nestV671TrackCategories,
  filterPmLayoutMenuItems,
  groupMenuTreeByIndustryPack,
  relocateMisbucketedToTrackCategories,
  reorganizeMenuRoots,
  resolvePlatformHierarchyLayout,
} from '@nidus/config/pmoMenuHierarchyUtils'

/** PostgREST URL limit — batch `.in('id', …)` to avoid 400 Bad Request. */
const MENU_IN_QUERY_CHUNK_SIZE = 80

function chunkArray(items = [], size = MENU_IN_QUERY_CHUNK_SIZE) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) return []
  const chunks = []
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size))
  }
  return chunks
}

/**
 * Legacy DB section header codes (replaced by pmo-cat-* category rows in v676).
 * Still present in old DB/cache entries — stripped during transform as backward compat.
 */
const LEGACY_SECTION_HEADER_CODES = new Set([
  // Platform legacy sections (replaced by pmo-cat-* in v676)
  'pmo_section_governance',
  'pmo_section_initiation',
  'pmo_admin_section',
  'pmo_section_okr',
  'pmo_section_collaboration',
  'pmo_section_notification',
  'pmo_process_templates_section',
  'pmo_section_platform_config',
  'platform_governance_admin',
  'pm_section_initiation',
  'pm_section_governance',
  'pm_process_templates_section',
  // Simulator legacy sections (replaced by sim_pmo_cat_* / sim_pm_cat_* in v677)
  'sim_pmo_section_initiation',
  'sim_pmo_section_governance',
  'sim_pmo_section_oversight',
  'sim_pmo_process_templates_section',
  'sim_pm_section_initiation',
  'sim_pm_process_templates_section',
])

/**
 * pmo-cat-* codes for methodology track categories (wrapped under [S]/[P]/[A] headers).
 * All other category nodes are "universal" (rendered directly in the sidebar).
 */
const TRACK_CATEGORY_CODES = new Set([
  // Platform methodology track categories (v676)
  'pmo-cat-initiation',
  'pmo-cat-governance-standards',
  'pmo-cat-standards-based',
  'pmo-cat-agile-lean',
  // Simulator PMO methodology track categories (v677)
  'sim_pmo_cat_initiation',
  'sim_pmo_cat_governance',
  'sim_pmo_cat_standards_based',
  'sim_pmo_cat_agile',
  // Simulator PM methodology track categories (v677)
  'sim_pm_cat_initiation',
  'sim_pm_cat_governance',
  'sim_pm_cat_standards_based',
  'sim_pm_cat_agile',
])

function enrichLayoutHintWithMethodology(layoutHint = null) {
  if (!layoutHint) return null
  const userPref = readUserMethodologyPreference()
  const visibleTrackSet = resolveVisibleTracks(
    layoutHint.orgMethodology,
    layoutHint.projectMethodology,
    layoutHint.allowProjectOverride,
    userPref
  )
  return { ...layoutHint, userPref, visibleTracks: [...visibleTrackSet] }
}

function transformMenuHierarchy(hierarchy = [], layoutHint = null) {
  try {
    return applyRoleSidebarRevamp(hierarchy, enrichLayoutHintWithMethodology(layoutHint))
  } catch (err) {
    console.warn('useMenu: sidebar transform failed:', err)
    return []
  }
}


/** Account chain (up to 2 sequential round trips) — depends only on userRow. */
async function resolveAccountMethodology(userId) {
  const { data: owned, error: ownedErr } = await platformDb
    .from('accounts')
    .select('id, default_methodology, allow_project_methodology_override')
    .eq('owner_user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (!ownedErr && owned) return owned

  const { data: proj, error: projLookupErr } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('owner_user_id', userId)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (projLookupErr || !proj?.account_id) return null

  const { data: acct, error: acctErr } = await platformDb
    .from('accounts')
    .select('id, default_methodology, allow_project_methodology_override')
    .eq('id', proj.account_id)
    .maybeSingle()
  return acctErr ? null : acct
}

/** Project-track lookup (up to 2 sequential round trips) — depends only on the URL, not the user/account. */
async function resolveProjectMethodology(pathname) {
  const projectId = extractProjectIdFromPath(pathname)
  if (!projectId) return null

  const { data: withTrack, error: trackErr } = await platformDb
    .from('projects')
    .select('delivery_methodology_track, delivery_methodology')
    .eq('id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (!trackErr && withTrack) return withTrack

  const { data: legacy } = await platformDb
    .from('projects')
    .select('delivery_methodology')
    .eq('id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  return legacy
}

// Rule 66: the account chain and the project-track lookup share no dependency (one keys off
// userRow.id, the other off the URL's projectId) — running them in Promise.all instead of one
// after another cuts up to 2 sequential round trips off every menu load, on top of whatever
// internal round trips each chain itself still needs.
async function fetchMethodologyContext(userRow, { pathname = '' } = {}) {
  const base = {
    orgMethodology: 'hybrid',
    allowProjectOverride: true,
    projectMethodology: null,
    userPref: readUserMethodologyPreference(),
  }
  if (!userRow?.id) return base

  const [account, project] = await Promise.all([
    resolveAccountMethodology(userRow.id),
    resolveProjectMethodology(pathname),
  ])

  if (account) {
    base.orgMethodology = account.default_methodology || 'hybrid'
    base.allowProjectOverride = account.allow_project_methodology_override !== false
  }
  if (project) {
    base.projectMethodology = project.delivery_methodology_track || project.delivery_methodology || null
  }

  return base
}

export { resolveVisibleTracks } from '@nidus/config/methodologyMenuUtils'

export { applyRoleSidebarRevamp }
export { purgeAllSidebarMenuCaches } from '@nidus/shared/utils/menuCacheUtils'

function buildHierarchy(menuRows = [], canUseById = new Map()) {
  const menuMap = new Map()
  const rootMenus = []

  menuRows.forEach((menu) => {
    if (!menu || !menu.is_visible || !menu.is_active) return
    menuMap.set(menu.id, { ...menu, canUse: !!canUseById.get(menu.id), children: [] })
  })

  menuMap.forEach((menu) => {
    if (menu.parent_menu_id) {
      const parent = menuMap.get(menu.parent_menu_id)
      if (parent) parent.children.push(menu)
      else rootMenus.push(menu)
    } else {
      rootMenus.push(menu)
    }
  })

  const sort = (menus) =>
    menus
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(m => ({ ...m, children: sort(m.children || []) }))

  return sort(rootMenus)
}

/** Strip legacy section header nodes when v676+ category rows exist; keep legacy tree otherwise. */
function stripLegacySectionNodes(nodes = []) {
  const list = Array.isArray(nodes) ? nodes : []
  const hasModernCategories = list.some((n) => {
    const code = String(n?.menu_code || '')
    return (
      code.startsWith('pmo-cat-') ||
      code.startsWith('sim_pmo_cat_') ||
      code.startsWith('sim_pm_cat_')
    )
  })
  if (!hasModernCategories) return list
  return list
    .filter(n => !LEGACY_SECTION_HEADER_CODES.has(String(n?.menu_code || '').trim().toLowerCase()))
    .map(n => ({ ...n, children: stripLegacySectionNodes(n.children || []) }))
}

function buildSidebarPresentation(hierarchy = [], layoutHint = null) {
  let presentation = transformMenuHierarchy(hierarchy, layoutHint)
  if (presentation.length > 0 || hierarchy.length === 0) return presentation
  const soft = stripVirtualMenuItems(stripLegacySectionNodes(hierarchy))
  if (soft.length > 0) {
    console.warn('[useMenu] transform produced empty tree; using DB hierarchy fallback')
    const allTracksHint = {
      ...layoutHint,
      visibleTracks: [...METHODOLOGY_TRACK_IDS],
    }
    presentation = applyRoleSidebarRevamp(soft, enrichLayoutHintWithMethodology(allTracksHint))
  }
  return presentation
}

const MENU_LOAD_TIMEOUT_MS = 45000
const LINK_AUTH_TIMEOUT_MS = 8000

// v918/v924 — SaaS Industry-Aware Tenant Provisioning: local kill-switch for the
// org-industry-availability filter, until admin.feature_flags is actually wired into
// Platform/Simulator (CLAUDE.md documents that exception but the audit for this initiative
// found it unimplemented — this is the first real consumer of it, tracked as a follow-up).
// ACTIVE (confirmed): matches the brief's target onboarding model (Documentation/
// SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md §1), where Industry Capability Pack is an
// unconditional contributor to "Resolved User Menu". Fail-open design (see
// applyOrgMenuAvailabilityFilter below) bounds the blast radius to only menu items actually
// classified into industry_pack_menu_items — everything else stays visible exactly as before.
const INDUSTRY_MENU_AVAILABILITY_ENABLED = true

/**
 * Pure fail-open filter: narrow menuIds to whatever the org-availability RPC allows, but never
 * to an empty set — an empty result from get_account_available_menu_item_ids almost certainly
 * means unseeded/misconfigured industry_pack_menu_items, not "this org has access to nothing"
 * (v918/v924/Phase 10). Extracted from fetchMenuFromDB's inline filter so it's independently
 * unit-testable without needing a live RPC or the availability flag flipped on.
 * @param {string[]} menuIds
 * @param {string[]|Set<string>} availableIds
 * @returns {string[]}
 */
export function applyOrgMenuAvailabilityFilter(menuIds, availableIds) {
  const available = availableIds instanceof Set ? availableIds : new Set(availableIds)
  const filtered = menuIds.filter((id) => available.has(id))
  return filtered.length > 0 ? filtered : menuIds
}

async function resolveAuthUser() {
  const { data: { session } } = await platformDb.auth.getSession()
  if (session?.user) return session.user
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)))
    const { data: { session: retry } } = await platformDb.auth.getSession()
    if (retry?.user) return retry.user
  }
  const { data: { user } } = await platformDb.auth.getUser()
  return user || null
}

function withMenuLoadTimeout(promise) {
  let timerId
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error('Sidebar menu load timed out. Please retry.')),
      MENU_LOAD_TIMEOUT_MS,
    )
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timerId) clearTimeout(timerId)
  })
}

const MENU_ITEM_SELECT_CORE = `
    id,
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    external_url,
    menu_icon,
    menu_color,
    badge_text,
    badge_color,
    is_visible,
    is_active
  `

// menu_items is small, static, role-independent reference data (the whole app's sidebar
// taxonomy — hundreds of rows, not millions), so fetching it in full once is far cheaper than
// the resolution it replaced: a separate per-code category lookup query PLUS an iterative,
// up-to-12-sequential-round-trip ancestor-hydration loop (each round its own network call) that
// used to run after the role-granted ids were known. Fetching it in full also means the request
// can start immediately, in parallel with the very first user-scoped query, since it depends on
// nothing user-specific — a real 66/rule perf pass, not a cache band-aid (found live 2026-09-11:
// a visibly slow sidebar skeleton on every cache-miss load).
async function fetchAllActiveMenuItemRows() {
  const withMethodology = `${MENU_ITEM_SELECT_CORE.trim()}, methodology`
  const rows = []
  let offset = 0
  for (;;) {
    let { data, error } = await platformDb
      .from('menu_items')
      .select(withMethodology)
      .eq('is_active', true)
      .eq('is_visible', true)
      .range(offset, offset + ROLE_MENU_ITEMS_PAGE_SIZE - 1)

    if (error && /methodology/i.test(String(error.message || ''))) {
      const fallback = await platformDb
        .from('menu_items')
        .select(MENU_ITEM_SELECT_CORE)
        .eq('is_active', true)
        .eq('is_visible', true)
        .range(offset, offset + ROLE_MENU_ITEMS_PAGE_SIZE - 1)
      data = fallback.data
      error = fallback.error
    }
    if (error) return { data: null, error }

    const batch = data || []
    rows.push(...batch)
    if (batch.length < ROLE_MENU_ITEMS_PAGE_SIZE) break
    offset += batch.length
  }
  return { data: rows, error: null }
}


/**
 * DB-first sidebar transform (v676).
 * The DB now holds the complete hierarchy (pmo-cat-* category rows as real DB rows,
 * items parented to them). This function just:
 *   1. Strips legacy section headers / virtual items (backward compat with old cache)
 *   2. Separates methodology-track categories from universal categories
 *   3. Adds visual [S]/[P]/[A] track header wrappers
 *   4. Filters hidden tracks and applies PM role profile filtering
 */
function applyRoleSidebarRevamp(menuItems = [], layoutHint = null) {
  // Strip legacy section headers + virtual items (backward compat with stale cache / old DB)
  const roots = stripVirtualMenuItems(
    stripLegacySectionNodes(Array.isArray(menuItems) ? menuItems : [])
  )

  const hierarchyLayout = resolvePlatformHierarchyLayout(layoutHint?.layout)
  let universalNodes = []
  let trackCategoryNodes = []

  if (hierarchyLayout) {
    const { universalNodes: u, trackCategoryNodes: t } = reorganizeMenuRoots(roots, hierarchyLayout)
    universalNodes = applyCategorySortOrders(u, hierarchyLayout)
    trackCategoryNodes = applyCategorySortOrders(t, hierarchyLayout)
    if (hierarchyLayout === 'pmo') {
      const nested = applyPmoSectionNesting(universalNodes, 'pmo')
      universalNodes = nested.universalNodes
      trackCategoryNodes = relocateMisbucketedToTrackCategories(
        trackCategoryNodes,
        nested.trackMisbucketed,
        'pmo'
      )
      trackCategoryNodes = nestV671TrackCategories(trackCategoryNodes, 'pmo')
    } else if (hierarchyLayout === 'pm') {
      const pmSanitized = applyPmLayoutSanitization(universalNodes, trackCategoryNodes)
      universalNodes = filterPmLayoutMenuItems(
        applyCategoryPresentationLabels(pmSanitized.universalNodes)
      )
      trackCategoryNodes = pmSanitized.trackCategoryNodes
    }
    trackCategoryNodes = applyTrackCategoryPresentationLabels(trackCategoryNodes)
  } else {
    for (const node of roots) {
      const code = String(node?.menu_code || '')
      if (TRACK_CATEGORY_CODES.has(code)) {
        trackCategoryNodes.push(node)
      } else {
        universalNodes.push(node)
      }
    }
  }

  const visibleTracks = layoutHint?.visibleTracks?.length
    ? new Set(layoutHint.visibleTracks)
    : new Set(METHODOLOGY_TRACK_IDS)

  const trackAnchor = hierarchyLayout
    ? getTrackAnchorForLayout(hierarchyLayout)
    : { position: 'after', code: 'pmo-cat-project-delivery' }

  // Core PM taxonomy has no Structured / Standards-Based / Agile sidebar sections.
  // Methodology focus stays in the sidebar switcher. Those headers are PMO-only.
  const isProjectManagerLayout = hierarchyLayout === 'pm' || hierarchyLayout === 'tm'
  let tree = isProjectManagerLayout
    ? [...universalNodes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : wrapPmoMenuWithMethodologyTracks(
        universalNodes,
        visibleTracks,
        trackCategoryNodes,
        trackAnchor
      )

  if (!isProjectManagerLayout) {
    tree = filterMenuTreeByVisibleTracks(tree, visibleTracks)
  }

  // PM role sub-profile filtering (executive, sponsor, board, assurance, etc.)
  if (layoutHint?.layout === 'pm') {
    tree = filterMenuByPmProfile(tree, layoutHint?.pmProfile)
  }

  if (hierarchyLayout === 'pmo') {
    tree = filterExcludedPmoLayoutMenuItems(tree)
    tree = dedupePmoMenuTree(tree, hierarchyLayout)
  } else if (hierarchyLayout === 'pm') {
    tree = dedupePmoMenuTree(filterPmLayoutMenuItems(tree), hierarchyLayout)
  }

  return tree
}

/**
 * Filter DB menu hierarchy to simulator scope (PMO or PM practice dashboards).
 * @param {object[]} hierarchy
 * @param {'pmo'|'pm'} scope
 * @param {{ visibleTracks?: Set<string> }} [options]
 */
export function applySimulatorMenuTransform(hierarchy = [], scope = 'pmo', { visibleTracks } = {}) {
  const norm = (s) => String(s || '').trim().toLowerCase()

  const isSimNode = (node) => {
    const code = norm(node?.menu_code)
    const path = norm(node?.route_path)
    if (scope === 'pmo') {
      if (code.startsWith('sim_pmo')) return true
      if (path && path.startsWith('/simulator/pmo')) return true
      return false
    }
    if (scope === 'pm') {
      if (code.startsWith('sim_pm')) return true
      if (path && path.startsWith('/simulator/pm')) return true
      return false
    }
    return code.startsWith('sim_') || path.includes('/simulator/')
  }

  const filterTree = (nodes) => {
    const out = []
    for (const node of nodes || []) {
      const children = filterTree(node.children || [])
      if (isSimNode(node)) {
        out.push({ ...node, children })
      } else if (children.length) {
        out.push({ ...node, children })
      }
    }
    return out.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  const layoutKey = scope === 'pmo' ? 'sim_pmo' : 'sim_pm'
  const filtered = filterTree(hierarchy)
  const { universalNodes: u, trackCategoryNodes: t } = reorganizeMenuRoots(filtered, layoutKey)
  let universalNodes = applyCategorySortOrders(u, layoutKey)
  let trackCategoryNodes = applyCategorySortOrders(t, layoutKey)
  if (layoutKey === 'sim_pmo') {
    const nested = applyPmoSectionNesting(universalNodes, 'sim_pmo')
    universalNodes = nested.universalNodes
    trackCategoryNodes = relocateMisbucketedToTrackCategories(
      trackCategoryNodes,
      nested.trackMisbucketed,
      'sim_pmo'
    )
    trackCategoryNodes = nestV671TrackCategories(trackCategoryNodes, 'sim_pmo')
  }
  trackCategoryNodes = applyTrackCategoryPresentationLabels(trackCategoryNodes)
  const trackSet =
    visibleTracks && visibleTracks.size > 0
      ? visibleTracks
      : new Set(METHODOLOGY_TRACK_IDS)
  let result = layoutKey === 'sim_pm'
    ? [...universalNodes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : wrapPmoMenuWithMethodologyTracks(
        universalNodes,
        trackSet,
        trackCategoryNodes,
        getTrackAnchorForLayout(layoutKey)
      )
  if (layoutKey !== 'sim_pm' && trackSet.size > 0 && trackSet.size < 3) {
    result = filterMenuTreeByVisibleTracks(result, trackSet)
  }
  return applySimulatorRegistryFallback(result, scope)
}

/** Dedupe concurrent menu fetches (Sidebar + MobileNavigation + DynamicMenu each call useMenu). */
const menuFetchInflight = new Map()

export async function fetchMenuFromDBShared(user, options = {}) {
  const uid = user?.id
  if (!uid) return fetchMenuFromDB(user, options)
  const layoutPref = options.layoutPreference || inferLayoutScopeFromPathname(options.pathname || '') || ''
  const key = `${uid}:${options.raw ? 'raw' : 'full'}:${options.pathname || ''}:${layoutPref}`
  if (menuFetchInflight.has(key)) return menuFetchInflight.get(key)
  const promise = fetchMenuFromDB(user, options).finally(() => {
    menuFetchInflight.delete(key)
  })
  menuFetchInflight.set(key, promise)
  return promise
}

// fetchUserRoleNamesForAuthUser lives in menuLayoutUtils.js now (also used by useRoleScopeGuard).

// Pure DB fetch — returns { items, error }. No fallback; menu data is from DB only.
// Use two separate queries to avoid PostgREST "more than one relationship" embed error between users and user_roles.
export async function fetchMenuFromDB(user, { raw = false, pathname = '', layoutPreference = null } = {}) {
  // Kicked off immediately, before anything user-scoped resolves — this table has zero
  // dependency on the calling user's identity, so its round trip overlaps every later query
  // instead of sitting on the critical path (see fetchAllActiveMenuItemRows's comment).
  const allMenuItemsPromise = fetchAllActiveMenuItemRows()

  let { data: userRow, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (userError || !userRow?.id) {
    // auth_user_id not linked yet (invited user) — attempt repair then retry once
    try {
      await Promise.race([
        platformDb.rpc('link_auth_account'),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('link_auth_account timed out')), LINK_AUTH_TIMEOUT_MS)
        }),
      ])
    } catch (linkErr) {
      console.warn('useMenu: link_auth_account skipped or failed:', linkErr?.message || linkErr)
    }
    const { data: retriedRow } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!retriedRow?.id) {
      const msg = userError?.message || 'User record not found'
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
      console.warn('useMenu: failed to load user:', msg)
      return { items: null, error: `Menu unavailable: ${friendly}` }
    }
    // Repair succeeded — continue with the found row
    userRow = retriedRow
  }

  // Round 2 — parallel: user_roles + methodology context (both only need userRow.id)
  const [
    { data: roleRows, error: rolesError },
    methodologyCtx,
  ] = await Promise.all([
    platformDb
      .from('user_roles')
      .select('role_id, is_active, is_deleted')
      .eq('user_id', userRow.id)
      .eq('is_active', true),
    fetchMethodologyContext(userRow, { pathname }),
  ])

  if (rolesError) {
    console.warn('useMenu: failed to load user roles:', rolesError.message)
    return { items: null, error: `Menu unavailable: ${rolesError.message}. Please contact support if this persists.` }
  }

  const roleIds = (roleRows || [])
    .filter((ur) => !ur.is_deleted)
    .map((ur) => ur.role_id)
    .filter(Boolean)

  if (roleIds.length === 0) {
    const msg = 'No roles assigned. Menu cannot be loaded.'
    console.warn('useMenu:', msg)
    return { items: null, error: msg }
  }

  // Round 3 — role names, then layout-scoped menu assignments
  const { data: roleDetails, error: roleDetailsError } = await platformDb
    .from('roles')
    .select('id, role_name')
    .in('id', roleIds)

  if (roleDetailsError) {
    console.warn('useMenu: failed to load role names:', roleDetailsError.message)
    return { items: null, error: `Menu unavailable: ${roleDetailsError.message}` }
  }

  const roleNames = (roleDetails || []).map((r) => r.role_name).filter(Boolean)
  const effectiveLayoutPreference =
    layoutPreference || resolveMenuLayoutScope(null, pathname, roleNames)
  cacheUserMenuRoles(user.id, roleNames)

  const layoutBase = resolveLayoutType(roleNames, { layoutPreference: effectiveLayoutPreference })
  const scopedRoles = filterRolesForLayout(roleDetails || [], effectiveLayoutPreference)
  const scopedRoleIds = scopedRoles.map((r) => r.id).filter(Boolean)

  const visibleTrackSet = resolveVisibleTracks(
    methodologyCtx.orgMethodology,
    methodologyCtx.projectMethodology,
    methodologyCtx.allowProjectOverride,
    methodologyCtx.userPref
  )
  const layoutHint = {
    ...layoutBase,
    ...methodologyCtx,
    visibleTracks: [...visibleTrackSet],
    isSimulatorLearner: roleNamesIncludeLearner(roleNames),
  }

  // Round 4 — parallel: role-granted menu ids + org-industry-availability ids + PMO category ids.
  // None of these three actually depend on each other's *results* (the availability filter and
  // category union are cheap client-side array ops applied after) — only on data already
  // resolved above (scopedRoleIds / layoutBase) — so fire all three round trips together instead
  // of chaining them, cutting 2 sequential round trips off every menu load.
  const hierarchyLayout = resolvePlatformHierarchyLayout(layoutBase.layout)

  const availabilityPromise = INDUSTRY_MENU_AVAILABILITY_ENABLED
    ? (async () => {
        try {
          const accountId = await getCurrentUserAccountId()
          if (!accountId) return null
          // v1019: RPC now returns UUID[] directly (a plain array of ids), not
          // TABLE(menu_item_id UUID) row objects — PostgREST's default 1000-row
          // collection cap was silently truncating accounts with 1000+ available
          // ids; a scalar/array return isn't subject to that cap.
          const { data: availableIds, error: availabilityError } = await platformDb.rpc(
            'get_account_available_menu_item_ids',
            { p_account_id: accountId },
          )
          if (availabilityError || !Array.isArray(availableIds)) return null
          return availableIds
        } catch (availabilityErr) {
          console.warn('useMenu: org-industry-availability filter failed, showing role grants unfiltered:', availabilityErr?.message || availabilityErr)
          return null
        }
      })()
    : Promise.resolve(null)

  // Project-scoped roles (pm/tm layout) only see the industry section(s) of the CURRENTLY OPEN
  // project, not every industry across every project this user happens to manage — resolved at
  // the applyFetchResult call site via usePlatformProjectId() + getProjectIndustryCategoryIds()
  // (has access to the live route/context there; this plain fetch function does not). Org-wide
  // roles (pmo layout) are unaffected and keep seeing all of them.
  const [
    { data: roleMenuRows, error: menuError },
    availableIds,
    { data: allMenuRows, error: allMenuError },
  ] = await Promise.all([
    fetchRoleMenuRowsForRoles(scopedRoleIds),
    availabilityPromise,
    allMenuItemsPromise,
  ])

  if (menuError) {
    const msg = menuError.message || ''
    const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
    const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
    console.error('useMenu: error fetching menu items:', menuError)
    return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
  }

  if (allMenuError) {
    console.warn('useMenu: failed to load menu_items table:', allMenuError.message)
  }
  const allMenuById = new Map()
  const codeToId = new Map()
  for (const row of allMenuRows || []) {
    allMenuById.set(row.id, row)
    if (row.menu_code) codeToId.set(row.menu_code, row.id)
  }

  const categoryIds = hierarchyLayout
    ? getCategoryMenuCodes(hierarchyLayout).map((code) => codeToId.get(code)).filter(Boolean)
    : []

  let uniqueMenuIds = [...new Set((roleMenuRows || []).map((r) => r.menu_item_id).filter(Boolean))]

  // v918/v924 — org-industry-availability filter, applied to role-granted ids only, strictly
  // before category-placeholder ids are unioned in below (those are structural tree scaffolding,
  // not capability grants, and must never be filtered). Fails open on any error (network,
  // unresolvable account mid-registration, etc.) — never blocks or narrows the existing
  // role-grant-only behavior just because this new layer had trouble resolving.
  if (INDUSTRY_MENU_AVAILABILITY_ENABLED && uniqueMenuIds.length > 0 && Array.isArray(availableIds)) {
    const filtered = applyOrgMenuAvailabilityFilter(uniqueMenuIds, availableIds)
    // Array.prototype.filter always returns a new array reference, even when every element
    // matches — so reference equality here can only mean the helper's own fail-open branch
    // returned the original array back unchanged.
    if (filtered === uniqueMenuIds) {
      console.warn('useMenu: org-industry-availability filter would empty the menu — showing role grants unfiltered instead')
    }
    uniqueMenuIds = filtered
  }

  if (categoryIds.length > 0) {
    uniqueMenuIds = [...new Set([...uniqueMenuIds, ...categoryIds])]
  }
  if (uniqueMenuIds.length === 0) {
    return { items: [], rawHierarchy: [], error: null, layoutHint, effectiveLayoutScope: effectiveLayoutPreference }
  }

  const canUseById = new Map()
  for (const row of roleMenuRows || []) {
    if (!row?.menu_item_id) continue
    canUseById.set(row.menu_item_id, !!row.can_use || !!canUseById.get(row.menu_item_id))
  }

  // Step 2: resolve each granted id plus its full ancestor chain from the already-fetched full
  // menu_items table (allMenuById, above) — a synchronous in-memory walk, no further round trips.
  const includedIds = new Set()
  for (const id of uniqueMenuIds) {
    let cursor = id
    let guard = 0
    while (cursor && !includedIds.has(cursor) && guard < 50) {
      const row = allMenuById.get(cursor)
      if (!row) break
      includedIds.add(cursor)
      cursor = row.parent_menu_id
      guard += 1
    }
  }

  const menuRows = [...includedIds].map((id) => allMenuById.get(id)).filter(Boolean)
  let hierarchy = buildHierarchy(menuRows, canUseById)

  let billingAccess = { hasBillingAccess: false, accountId: null }
  if (isPlatformBillingEnabled()) {
    try {
      billingAccess = await resolveBillingAccess(user.id)
    } catch (billingErr) {
      console.warn('useMenu: billing access check failed:', billingErr?.message || billingErr)
    }
  }

  layoutHint.hasBillingAccess = billingAccess.hasBillingAccess
  layoutHint.accountId = billingAccess.accountId

  hierarchy = applyBillingMenuPolicy(
    hierarchy,
    billingAccess.hasBillingAccess,
    layoutHint.layout
  )

  if (raw) {
    return {
      items: hierarchy.length > 0 ? hierarchy : [],
      rawHierarchy: hierarchy,
      error: null,
      layoutHint,
      effectiveLayoutScope: effectiveLayoutPreference,
    }
  }
  let items
  try {
    items = applyRoleSidebarRevamp(hierarchy, layoutHint)
  } catch (revampErr) {
    console.error('useMenu: sidebar transform failed:', revampErr)
    return {
      items: null,
      error: `Menu unavailable: ${revampErr?.message || 'Sidebar layout failed'}`,
    }
  }
  // Note: pack-grouping (v930) is NOT applied here. Every current caller of this function
  // passes raw: true (both useMenu.js's own loadMenu() and useSimMenu.js), so `items` computed
  // above is dead code in practice — the real presentation is built from `rawHierarchy` via
  // buildSidebarPresentation()/applySimulatorMenuTransform() in each hook's own caching layer,
  // where pack-grouping is actually applied. See applyFetchResult() below.
  return {
    items: items.length > 0 ? items : [],
    rawHierarchy: hierarchy,
    error: null,
    layoutHint,
    effectiveLayoutScope: effectiveLayoutPreference,
  }
}

// PostgREST applies a default row cap (commonly 1000) to any query with no explicit .range() —
// role_menu_items easily exceeds that per role set once enough industry-pack content exists
// (confirmed live: 2026 rows for a single account's roles after the v946 taxonomy rollout), so
// an unpaginated query here silently truncates with no error, dropping whichever rows sort past
// the cap (in practice, the most-recently-inserted ones). Page through with .range() until an
// empty page comes back, advancing by the actual returned count each time so this is correct
// regardless of the server's real cap (known or not).
const ROLE_MENU_ITEMS_PAGE_SIZE = 500

async function fetchRoleMenuItemsPageForChunk(chunk) {
  const rows = []
  let offset = 0
  for (;;) {
    const { data, error } = await platformDb
      .from('role_menu_items')
      .select('menu_item_id, can_use')
      .in('role_id', chunk)
      .eq('can_view', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .range(offset, offset + ROLE_MENU_ITEMS_PAGE_SIZE - 1)
    if (error) return { data: null, error }
    const batch = data || []
    rows.push(...batch)
    // A page shorter than the requested size is necessarily the last one — stop here instead
    // of firing one more round trip just to confirm an empty page. Saves a full round trip
    // (400-900ms observed live) on every role whose granted-item count isn't an exact multiple
    // of ROLE_MENU_ITEMS_PAGE_SIZE, which is the common case.
    if (batch.length < ROLE_MENU_ITEMS_PAGE_SIZE) break
    offset += batch.length
  }
  return { data: rows, error: null }
}

async function fetchRoleMenuRowsForRoles(roleIds = []) {
  const ids = [...new Set(roleIds.filter(Boolean))]
  if (ids.length === 0) return { data: [], error: null }

  const chunks = chunkArray(ids, 40)
  const results = await Promise.all(chunks.map((chunk) => fetchRoleMenuItemsPageForChunk(chunk)))

  const rows = []
  for (const { data, error } of results) {
    if (error) return { data: null, error }
    rows.push(...(data || []))
  }
  return { data: rows, error: null }
}

const MenuContext = createContext(null)

/**
 * Module-level menu store keyed by `${userId}:${layoutScope}` so PM and PMO
 * layouts never share stale sidebar data across route changes.
 */
const EMPTY_MODULE_STATE = {
  menuItems:    [],
  rawHierarchy: [],
  layoutHint:   null,
  hasLoaded:    false,
  userId:       null,
  layoutScope:  null,
}

const _moduleStateByKey = new Map()

function getModuleState(key) {
  if (!key) return EMPTY_MODULE_STATE
  if (!_moduleStateByKey.has(key)) {
    _moduleStateByKey.set(key, { ...EMPTY_MODULE_STATE })
  }
  return _moduleStateByKey.get(key)
}

function resetAllModuleState() {
  _moduleStateByKey.clear()
  _lastKnownAuthUserId = null
}

// v1004 fix — permanent, not another cache-layer band-aid. Several sibling PMO/PM routes each
// mount their own Layout/MenuProvider instance (see the "Instant re-render on remount" comment
// below) — every navigation between them remounts useMenuProvider(). Until now, `loading` always
// *started* at `true` (useState(true)) and was only corrected inside the mount effect, so React
// committed at least one real paint with the sidebar skeleton showing — visible as a flash/reload
// on every such navigation — no matter how fast the effect's own cache checks resolved afterward.
// Fix: remember the auth user id (module-level, survives remounts, cleared on sign-out) the first
// time it's resolved, and use it to run the SAME quick-cache lookup the effect already does, but
// synchronously at useState's lazy-initializer time — i.e. before the first paint, not after it.
let _lastKnownAuthUserId = null

/** Best-effort, synchronous, side-effect-free snapshot for the very first render of a remount. */
function computeInitialMenuSnapshot(layoutScopeProp, pathname) {
  const fallback = { menuItems: [], layoutHint: null, loading: true, hasLoaded: false, moduleKey: null }
  if (!_lastKnownAuthUserId) return fallback // true first-ever mount — nothing to reuse yet

  const roleNames = getCachedUserMenuRoles(_lastKnownAuthUserId)?.roleNames
  if (!roleNames?.length) return fallback

  const layoutScope = resolveMenuLayoutScope(layoutScopeProp, pathname, roleNames)
  const stateKey = menuStateKey(_lastKnownAuthUserId, layoutScope)
  const mod = getModuleState(stateKey)
  if (mod.hasLoaded && mod.userId === _lastKnownAuthUserId && mod.layoutScope === layoutScope && mod.menuItems.length > 0) {
    return { menuItems: mod.menuItems, layoutHint: mod.layoutHint, loading: false, hasLoaded: true, moduleKey: stateKey }
  }

  const cached = readSidebarCache(_lastKnownAuthUserId, layoutScope)
  if (cached) {
    const presentation = cached.items?.length > 0
      ? cached.items
      : buildSidebarPresentation(cached.rawHierarchy, cached.layoutHint)
    if (presentation.length > 0) {
      return { menuItems: presentation, layoutHint: cached.layoutHint, loading: false, hasLoaded: true, moduleKey: stateKey }
    }
  }
  return fallback
}

function useMenuProvider(layoutScopeProp = null) {
  const location = useLocation()
  const layoutScopeRef = useRef(layoutScopeProp)
  layoutScopeRef.current = layoutScopeProp
  const activeScopeRef = useRef(null)
  // The project currently open (pm/tm layouts only) — used to scope the sidebar's industry
  // pack section(s) to THIS project, not every project this user happens to manage (see
  // getProjectIndustryCategoryIds's comment for the incident this fixes).
  const { projectId: currentProjectId, loading: currentProjectIdLoading } = usePlatformProjectId()
  const currentProjectIdRef = useRef(currentProjectId)
  currentProjectIdRef.current = currentProjectId
  const currentProjectIdLoadingRef = useRef(currentProjectIdLoading)
  currentProjectIdLoadingRef.current = currentProjectIdLoading

  // Computed once per mount (not per render — useRef, not a plain call) so a remount onto a
  // sibling Layout/MenuProvider can paint the correct sidebar on its very first render instead
  // of a guaranteed-at-least-one-frame skeleton flash. See computeInitialMenuSnapshot() above.
  const initialSnapshotRef = useRef(null)
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = computeInitialMenuSnapshot(layoutScopeProp, location.pathname)
  }

  const [menuItems, setMenuItems] = useState(() => initialSnapshotRef.current.menuItems)
  const [loading, setLoading]     = useState(() => initialSnapshotRef.current.loading)
  const [error, setError]         = useState(null)
  const [layoutHint, setLayoutHint] = useState(() => initialSnapshotRef.current.layoutHint)
  const hasLoadedRef    = useRef(initialSnapshotRef.current.hasLoaded)
  const loadInFlightRef = useRef(null)
  const currentUserRef  = useRef(null)
  const moduleKeyRef    = useRef(initialSnapshotRef.current.moduleKey)

  /** Apply a fetched hierarchy to state, module-level store, and localStorage cache. */
  const applyFetchResult = async (rawHierarchy, fetchedHint, userId, layoutScope) => {
    const hierarchy = Array.isArray(rawHierarchy) ? rawHierarchy : []
    const presentation = buildSidebarPresentation(hierarchy, fetchedHint)
    let finalItems = presentation.length > 0
      ? presentation
      : hierarchy.length > 0 ? stripVirtualMenuItems(hierarchy) : []
    if (presentation.length === 0 && hierarchy.length > 0) {
      console.warn('[useMenu] empty sidebar after transform; showing raw DB roots:', hierarchy.length)
    }

    // v930 — pack-grouped sidebar menu: wrap the finished tree into "Core Project Management"
    // + one section per enabled industry pack. getCurrentUserAccountId() is sessionStorage-
    // cached (rule 66), so this is cheap after the first resolution in a page session.
    // Project-scoped roles (pm/tm) are restricted to the CURRENTLY OPEN project's own industry
    // (0-or-1 ids) — not every industry across every project this user manages (found live
    // 2026-09-10, see getProjectIndustryCategoryIds's comment). Org-wide roles (pmo) pass null:
    // no restriction, every enabled org industry shows.
    // A Core-only grouping computed before the project or pack data is known must not be
    // persisted: the sidebar cache would otherwise serve it back on every reload until its TTL
    // expires, and the regroup effect only repairs the in-memory copy.
    let industryGroupingIncomplete = false
    if (finalItems.length > 0) {
      try {
        const isProjectScopedLayout = layoutScope === 'pm' || layoutScope === 'tm'
        const accountId = await getCurrentUserAccountId()
        if (!accountId) industryGroupingIncomplete = true
        if (accountId) {
          // pm/tm: when the open project has industries, show only those packs.
          // When it has none, pass null so the organisation's account_industries rows
          // supply the sections. An empty restrict list hides every pack.
          // While the project id is still resolving, wrap as Core/Platform only; the
          // regroup effect re-runs once projectId is ready.
          if (isProjectScopedLayout && (currentProjectIdLoadingRef.current || !currentProjectIdRef.current)) {
            industryGroupingIncomplete = true
            finalItems = groupMenuTreeByIndustryPack(finalItems, {
              sections: [],
              menuCodeToPack: new Map(),
              layout: layoutScope,
            })
          } else {
            const projIndustryRes = isProjectScopedLayout
              ? await getProjectIndustryCategoryIds(currentProjectIdRef.current)
              : { success: true, data: null }
            const projectIndustryIds = projIndustryRes?.success ? (projIndustryRes.data || []) : []
            const restrictToIndustryCategoryIds = !isProjectScopedLayout
              ? null
              : (projectIndustryIds.length > 0 ? projectIndustryIds : null)
            const packResult = await getMenuItemIndustryPackMap(accountId, restrictToIndustryCategoryIds)
            if (packResult.success) {
              finalItems = groupMenuTreeByIndustryPack(finalItems, { ...packResult.data, layout: layoutScope })
            } else {
              industryGroupingIncomplete = true
            }
          }
        }
      } catch (packErr) {
        industryGroupingIncomplete = true
        console.warn('[useMenu] pack-grouped sidebar context failed, showing ungrouped tree:', packErr?.message || packErr)
      }
    }

    const stateKey = menuStateKey(userId, layoutScope)
    const mod = getModuleState(stateKey)
    mod.menuItems    = finalItems
    mod.rawHierarchy = hierarchy
    mod.layoutHint   = fetchedHint
    mod.hasLoaded    = true
    mod.userId       = userId
    mod.layoutScope  = layoutScope
    moduleKeyRef.current = stateKey
    setMenuItems(finalItems)
    setLayoutHint(fetchedHint)
    hasLoadedRef.current = true
    if (!industryGroupingIncomplete) {
      writeSidebarCache(userId, layoutScope, { items: finalItems, rawHierarchy: hierarchy, layoutHint: fetchedHint })
    }
  }

  const loadMenu = async ({ forceRefresh = false, background = false } = {}) => {
    if (loadInFlightRef.current) {
      return loadInFlightRef.current
    }

    const run = (async () => {
      let user = null
      try {
        setError(null)

        user = await resolveAuthUser()
        if (!user) {
          setMenuItems([])
          setLayoutHint(null)
          setLoading(false)
          return
        }
        currentUserRef.current = user
        _lastKnownAuthUserId = user.id

        const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

        // ── Instant re-render on remount, no DB round-trip ──────────────────
        // Several sibling PMO/PM routes each mount their own Layout/MenuProvider
        // instance (not one shared ancestor), so navigating between them remounts
        // this hook. Without this pre-check, fetchUserRoleNamesForAuthUser() below
        // (a real users/user_roles query) would run — and show a loading flash —
        // on every such navigation, even when the cache is already warm.
        if (!forceRefresh) {
          const quickRoleNames = getCachedUserMenuRoles(user.id)?.roleNames
          if (quickRoleNames?.length) {
            const quickScope = resolveMenuLayoutScope(layoutScopeRef.current, pathname, quickRoleNames)
            const quickKey = menuStateKey(user.id, quickScope)
            const quickMod = getModuleState(quickKey)
            if (quickMod.hasLoaded && quickMod.userId === user.id && quickMod.layoutScope === quickScope && quickMod.menuItems.length > 0) {
              moduleKeyRef.current = quickKey
              setMenuItems(quickMod.menuItems)
              setLayoutHint(quickMod.layoutHint)
              setLoading(false)
              hasLoadedRef.current = true
              const quickCached = readSidebarCache(user.id, quickScope)
              if (quickCached && isSidebarCacheFresh(quickCached)) {
                return
              }
            } else {
              const quickCached = readSidebarCache(user.id, quickScope)
              if (quickCached) {
                // cached.items is the fully-finished presentation (already pack-grouped, see
                // applyFetchResult below) — use it as-is rather than recomputing from
                // rawHierarchy, which would skip grouping entirely and flash the ungrouped tree
                // (v930 regression, fixed here rather than papered over with a second best-effort
                // regroup pass).
                const presentation = quickCached.items?.length > 0
                  ? quickCached.items
                  : buildSidebarPresentation(quickCached.rawHierarchy, quickCached.layoutHint)
                if (presentation.length > 0) {
                  moduleKeyRef.current = quickKey
                  setMenuItems(presentation)
                  setLayoutHint(quickCached.layoutHint)
                  setLoading(false)
                  hasLoadedRef.current = true
                  quickMod.menuItems    = presentation
                  quickMod.rawHierarchy = quickCached.rawHierarchy
                  quickMod.layoutHint   = quickCached.layoutHint
                  quickMod.hasLoaded    = true
                  quickMod.userId       = user.id
                  quickMod.layoutScope  = quickScope
                  if (isSidebarCacheFresh(quickCached)) {
                    return
                  }
                }
              }
            }
          }
        }

        const roleNames = await fetchUserRoleNamesForAuthUser(user)
        const layoutScope = resolveMenuLayoutScope(layoutScopeRef.current, pathname, roleNames)
        const stateKey = menuStateKey(user.id, layoutScope)
        moduleKeyRef.current = stateKey
        const mod = getModuleState(stateKey)

        // ── Module-level state check (fastest path — no transform, no I/O) ──
        if (!forceRefresh && mod.hasLoaded && mod.userId === user.id && mod.layoutScope === layoutScope) {
          if (mod.menuItems.length > 0) {
            setMenuItems(mod.menuItems)
            setLayoutHint(mod.layoutHint)
            setLoading(false)
            hasLoadedRef.current = true
            const cached = readSidebarCache(user.id, layoutScope)
            if (cached && isSidebarCacheFresh(cached)) {
              return
            }
          }
        }

        // ── localStorage cache check ────────────────────────────────────────
        if (!forceRefresh) {
          const cached = readSidebarCache(user.id, layoutScope)
          if (cached) {
            // Same fix as the quick-cache branch above: cached.items already has pack-grouping
            // applied (written by applyFetchResult) — recomputing from rawHierarchy here skipped
            // that async step entirely, which is why a stale-but-present cache would flash the
            // ungrouped tree before the background DB refresh replaced it with the grouped one.
            const presentation = cached.items?.length > 0
              ? cached.items
              : buildSidebarPresentation(cached.rawHierarchy, cached.layoutHint)
            if (presentation.length > 0) {
              setMenuItems(presentation)
              setLayoutHint(cached.layoutHint)
              setLoading(false)
              hasLoadedRef.current = true
              mod.menuItems    = presentation
              mod.rawHierarchy = cached.rawHierarchy
              mod.layoutHint   = cached.layoutHint
              mod.hasLoaded    = true
              mod.userId       = user.id
              mod.layoutScope  = layoutScope

              if (isSidebarCacheFresh(cached)) {
                return
              }
            } else {
              clearSidebarCache(user.id, layoutScope)
              if (!hasLoadedRef.current) setLoading(true)
            }
          } else if (!hasLoadedRef.current) {
            setLoading(true)
          }
        } else {
          clearSidebarCache(user.id, layoutScope)
          setLoading(true)
        }
        // ── DB fetch ───────────────────────────────────────────────────────
        const { rawHierarchy, error: fetchError, layoutHint: fetchedHint, effectiveLayoutScope } =
          await withMenuLoadTimeout(
            fetchMenuFromDBShared(user, { pathname, raw: true, layoutPreference: layoutScope })
          )

        if (fetchError) {
          setError(fetchError)
          if (!hasLoadedRef.current) setMenuItems([])
          setLayoutHint(null)
        } else {
          const finalScope = effectiveLayoutScope || fetchedHint?.layout || layoutScope
          await applyFetchResult(rawHierarchy, fetchedHint, user.id, finalScope)
        }
      } catch (err) {
        const msg = err?.message || 'Failed to load sidebar menu'
        const isTimeout = /timed out/i.test(String(msg))
        const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
        const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
        const roleNames =
          getCachedUserMenuRoles(user?.id)?.roleNames ||
          (user ? await fetchUserRoleNamesForAuthUser(user).catch(() => []) : [])
        const layoutScope = resolveMenuLayoutScope(layoutScopeRef.current, pathname, roleNames)
        const mod = getModuleState(moduleKeyRef.current || menuStateKey(user?.id, layoutScope))

        if (isTimeout && user?.id) {
          const cached = readSidebarCache(user.id, layoutScope)
          if (cached?.rawHierarchy?.length) {
            console.warn('useMenu: fetch timed out — using cached sidebar')
            await applyFetchResult(cached.rawHierarchy, cached.layoutHint, user.id, layoutScope)
            setError(null)
          } else if (
            mod.hasLoaded &&
            mod.userId === user.id &&
            mod.layoutScope === layoutScope &&
            mod.menuItems.length > 0
          ) {
            console.warn('useMenu: fetch timed out — keeping last good sidebar')
            setMenuItems(mod.menuItems)
            setLayoutHint(mod.layoutHint)
            setError(null)
            hasLoadedRef.current = true
          } else if (!hasLoadedRef.current) {
            setError('Menu load timed out. Check your connection and use Retry, or refresh the page.')
            setMenuItems([])
            setLayoutHint(null)
          }
        } else if (!hasLoadedRef.current) {
          setError(isNetwork ? 'Connection problem. Check your network and try again.' : msg)
          setMenuItems([])
          setLayoutHint(null)
        }
        console.error('useMenu error:', err)
      } finally {
        setLoading(false)
        loadInFlightRef.current = null
      }
    })()

    if (!background) loadInFlightRef.current = run
    return run
  }

  useEffect(() => {
    purgeAllSidebarMenuCaches()
    loadMenu()
    const { data: { subscription } } = platformDb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !hasLoadedRef.current) {
        loadMenu()
      } else if (event === 'SIGNED_OUT') {
        clearSidebarCache(currentUserRef.current?.id)
        clearPersistedMenuLayoutScope()
        clearCachedUserMenuRoles()
        resetAllModuleState()
        currentUserRef.current  = null
        moduleKeyRef.current    = null
        hasLoadedRef.current    = false
        loadInFlightRef.current = null
        setMenuItems([])
        setLayoutHint(null)
        setLoading(false)
        setError(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const scope = resolveMenuLayoutScope(
      layoutScopeRef.current,
      location.pathname,
      getCachedUserMenuRoles(currentUserRef.current?.id)?.roleNames || []
    )
    if (activeScopeRef.current && activeScopeRef.current !== scope) {
      hasLoadedRef.current = false
      loadMenu()
    }
    activeScopeRef.current = scope
  }, [location.pathname, layoutScopeProp])

  useEffect(() => {
    const onPref = () => loadMenu({ forceRefresh: true })
    window.addEventListener('nidus-methodology-pref-changed', onPref)
    return () => window.removeEventListener('nidus-methodology-pref-changed', onPref)
  }, [])

  // Re-group the sidebar's industry pack section(s) when the user switches to a different
  // project (e.g. the pm-layout project switcher), without a full DB refetch of role/menu
  // grants — just re-derives finalItems from the already-loaded rawHierarchy against the newly
  // active project's own industry.
  //
  // usePlatformProjectId() starts at null/loading on every mount and MenuProvider itself
  // remounts on many PM/PMO navigations. Waiting for currentProjectIdLoading to go false before
  // establishing the baseline skips the false-positive null→resolved remount noise. When the
  // baseline is first established AFTER menu data already loaded (common: DB fetch finished
  // while projectId was still resolving), we MUST re-run applyFetchResult once — otherwise
  // industry packs stay missing forever (found live 2026-09-17: Banking & Financial Services
  // set on the project but sidebar only showed Core + Platform).
  const prevProjectIdForRegroupRef = useRef(undefined)
  const projectIdBaselineEstablishedRef = useRef(false)
  useEffect(() => {
    if (currentProjectIdLoading) return
    const mod = getModuleState(moduleKeyRef.current)
    const canRegroup =
      mod?.hasLoaded &&
      mod.layoutScope === activeScopeRef.current &&
      (mod.layoutScope === 'pm' || mod.layoutScope === 'tm')

    if (!projectIdBaselineEstablishedRef.current) {
      projectIdBaselineEstablishedRef.current = true
      prevProjectIdForRegroupRef.current = currentProjectId
      if (canRegroup && currentProjectId) {
        applyFetchResult(mod.rawHierarchy, mod.layoutHint, mod.userId, mod.layoutScope)
      }
      return
    }
    if (prevProjectIdForRegroupRef.current === currentProjectId) return
    prevProjectIdForRegroupRef.current = currentProjectId
    // mod.layoutScope must match activeScopeRef.current (THIS instance's own, freshly-resolved
    // current scope, not just "is it pm/tm at all") — moduleKeyRef.current/getModuleState read a
    // module-level Map shared across every MenuProvider instance in the app (Sidebar + mobile nav
    // + any PMO Workspace instance elsewhere), so without this check a PM user could have a stale
    // 'pmo' entry (from an earlier PMO visit, or another instance) force-applied into their own
    // sidebar the moment currentProjectId happens to change — seen live as "PMO Workspace"
    // rendering for a Project Manager on a PM-layout page (found 2026-09-11).
    if (canRegroup) {
      applyFetchResult(mod.rawHierarchy, mod.layoutHint, mod.userId, mod.layoutScope)
    }
  }, [currentProjectId, currentProjectIdLoading])

  const refetch = async () => {
    purgeAllSidebarMenuCaches()
    await loadMenu({ forceRefresh: true })
  }

  return { menuItems, loading, error, layoutHint, refetch }
}

/** Single shared menu state — wrap any layout that renders Sidebar with MenuProvider. */
export function MenuProvider({ children, layoutScope = null }) {
  const value = useMenuProvider(layoutScope)
  return createElement(MenuContext.Provider, { value }, children)
}

export function useMenu() {
  const ctx = useContext(MenuContext)
  if (!ctx) {
    throw new Error('useMenu() requires <MenuProvider>. Wrap Layout/PMOLayout/PMLayout with MenuProvider.')
  }
  return ctx
}
