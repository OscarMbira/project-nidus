import { createContext, useContext, useState, useEffect, useRef, createElement } from 'react'
import { useLocation } from 'react-router-dom'
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


async function fetchMethodologyContext(userRow, { pathname = '' } = {}) {
  const base = {
    orgMethodology: 'hybrid',
    allowProjectOverride: true,
    projectMethodology: null,
    userPref: readUserMethodologyPreference(),
  }
  if (!userRow?.id) return base

  let account = null
  const { data: owned, error: ownedErr } = await platformDb
    .from('accounts')
    .select('id, default_methodology, allow_project_methodology_override')
    .eq('owner_user_id', userRow.id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (!ownedErr && owned) account = owned

  if (!account) {
    const { data: proj, error: projLookupErr } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('owner_user_id', userRow.id)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (!projLookupErr && proj?.account_id) {
      const { data: acct, error: acctErr } = await platformDb
        .from('accounts')
        .select('id, default_methodology, allow_project_methodology_override')
        .eq('id', proj.account_id)
        .maybeSingle()
      if (!acctErr) account = acct
    }
  }

  if (account) {
    base.orgMethodology = account.default_methodology || 'hybrid'
    base.allowProjectOverride = account.allow_project_methodology_override !== false
  }

  const projectId = extractProjectIdFromPath(pathname)
  if (projectId) {
    let project = null
    const { data: withTrack, error: trackErr } = await platformDb
      .from('projects')
      .select('delivery_methodology_track, delivery_methodology')
      .eq('id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (!trackErr && withTrack) {
      project = withTrack
    } else {
      const { data: legacy } = await platformDb
        .from('projects')
        .select('delivery_methodology')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()
      project = legacy
    }
    if (project) {
      base.projectMethodology =
        project.delivery_methodology_track || project.delivery_methodology || null
    }
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
const MENU_HYDRATE_MAX_ROUNDS = 12
const LINK_AUTH_TIMEOUT_MS = 8000

// v918/v924 — SaaS Industry-Aware Tenant Provisioning: temporary local kill-switch for the new
// org-industry-availability filter, until admin.feature_flags is actually wired into
// Platform/Simulator (CLAUDE.md documents that exception but the audit for this initiative
// found it unimplemented — this is the first real consumer of it, tracked as a follow-up).
// Defaults OFF: with this false, useMenu.js's behavior is byte-for-byte identical to before
// this initiative — no risk to existing sidebar rendering until explicitly enabled for testing.
const INDUSTRY_MENU_AVAILABILITY_ENABLED = false

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

async function fetchMenuItemRowsByIdsParallel(ids = [], options = {}) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return { data: [], error: null }

  const chunks = chunkArray(uniqueIds)
  const results = await Promise.all(chunks.map((chunk) => fetchMenuItemRowsByIds(chunk, options)))

  const rows = []
  for (const result of results) {
    if (result.error) return { data: null, error: result.error }
    rows.push(...(result.data || []))
  }
  return { data: rows, error: null }
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

async function fetchMenuItemRowsByIds(chunk = [], { relaxFilters = false } = {}) {
  const withMethodology = `${MENU_ITEM_SELECT_CORE.trim()}, methodology`
  let query = platformDb.from('menu_items').select(withMethodology).in('id', chunk)
  if (!relaxFilters) {
    query = query.eq('is_active', true).eq('is_visible', true)
  }
  let result = await query

  if (result.error && /methodology/i.test(String(result.error.message || ''))) {
    let fallbackQuery = platformDb.from('menu_items').select(MENU_ITEM_SELECT_CORE).in('id', chunk)
    if (!relaxFilters) {
      fallbackQuery = fallbackQuery.eq('is_active', true).eq('is_visible', true)
    }
    result = await fallbackQuery
  }
  return result
}

async function fetchMenuCategoryRowIds(codes = []) {
  const list = [...new Set((codes || []).filter(Boolean))]
  if (list.length === 0) return []

  const chunks = chunkArray(list, 40)
  const results = await Promise.all(
    chunks.map((chunk) =>
      platformDb
        .from('menu_items')
        .select('id')
        .in('menu_code', chunk)
        .eq('is_active', true)
        .eq('is_visible', true),
    ),
  )

  const ids = []
  for (const { data, error } of results) {
    if (error) {
      console.warn('useMenu: failed to load PMO category rows:', error.message)
      continue
    }
    for (const row of data || []) {
      if (row?.id) ids.push(row.id)
    }
  }
  return ids
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
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[useMenu] applyRoleSidebarRevamp DB-first v676, items:', (menuItems || []).length)
  }

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

  let tree = wrapPmoMenuWithMethodologyTracks(
    universalNodes,
    visibleTracks,
    trackCategoryNodes,
    trackAnchor
  )

  // Remove sections whose methodology track is hidden
  tree = filterMenuTreeByVisibleTracks(tree, visibleTracks)

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
  let result = wrapPmoMenuWithMethodologyTracks(
    universalNodes,
    trackSet,
    trackCategoryNodes,
    getTrackAnchorForLayout(layoutKey)
  )
  if (trackSet.size > 0 && trackSet.size < 3) {
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

  const { data: roleMenuRows, error: menuError } = await fetchRoleMenuRowsForRoles(scopedRoleIds)

  if (menuError) {
    const msg = menuError.message || ''
    const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
    const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
    console.error('useMenu: error fetching menu items:', menuError)
    return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
  }

  let uniqueMenuIds = [...new Set((roleMenuRows || []).map((r) => r.menu_item_id).filter(Boolean))]

  // v918/v924 — org-industry-availability filter, applied to role-granted ids only, strictly
  // before category-placeholder ids are unioned in below (those are structural tree scaffolding,
  // not capability grants, and must never be filtered). Fails open on any error (network,
  // unresolvable account mid-registration, etc.) — never blocks or narrows the existing
  // role-grant-only behavior just because this new layer had trouble resolving.
  if (INDUSTRY_MENU_AVAILABILITY_ENABLED && uniqueMenuIds.length > 0) {
    try {
      const accountId = await getCurrentUserAccountId()
      if (accountId) {
        const { data: availableRows, error: availabilityError } = await platformDb.rpc(
          'get_account_available_menu_item_ids',
          { p_account_id: accountId },
        )
        if (!availabilityError && Array.isArray(availableRows)) {
          const availableIds = availableRows.map((r) => r.menu_item_id)
          const filtered = applyOrgMenuAvailabilityFilter(uniqueMenuIds, availableIds)
          // Array.prototype.filter always returns a new array reference, even when every
          // element matches — so reference equality here can only mean the helper's own
          // fail-open branch returned the original array back unchanged.
          if (filtered === uniqueMenuIds) {
            console.warn('useMenu: org-industry-availability filter would empty the menu — showing role grants unfiltered instead')
          }
          uniqueMenuIds = filtered
        }
      }
    } catch (availabilityErr) {
      console.warn('useMenu: org-industry-availability filter failed, showing role grants unfiltered:', availabilityErr?.message || availabilityErr)
    }
  }

  // Round 4 — parallel: PMO category IDs + nothing else yet (categoryIds needed before hydration)
  const hierarchyLayout = resolvePlatformHierarchyLayout(layoutBase.layout)
  if (hierarchyLayout) {
    const categoryIds = await fetchMenuCategoryRowIds(getCategoryMenuCodes(hierarchyLayout))
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

  // Step 2: fetch assigned menu rows, then hydrate full ancestor chain.
  const menuMap = new Map()
  const attemptedIds = new Set()
  let pendingIds = uniqueMenuIds.filter(Boolean)
  let hydrateParentsRound = false
  let hydrateRound = 0

  while (pendingIds.length > 0 && hydrateRound < MENU_HYDRATE_MAX_ROUNDS) {
    hydrateRound += 1
    const batchIds = pendingIds.filter((id) => !menuMap.has(id) && !attemptedIds.has(id))
    if (batchIds.length === 0) break

    batchIds.forEach((id) => attemptedIds.add(id))
    const { data: fetchedRows, error: menuRowsError } = await fetchMenuItemRowsByIdsParallel(
      batchIds,
      { relaxFilters: hydrateParentsRound },
    )

    if (menuRowsError) {
      const msg = menuRowsError.message || ''
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
      return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
    }

    for (const row of fetchedRows || []) {
      menuMap.set(row.id, row)
    }

    const missingParentIds = new Set()
    for (const row of menuMap.values()) {
      const pid = row?.parent_menu_id
      if (pid && !menuMap.has(pid) && !attemptedIds.has(pid)) {
        missingParentIds.add(pid)
      }
    }
    pendingIds = [...missingParentIds]
    hydrateParentsRound = pendingIds.length > 0
  }

  if (hydrateRound >= MENU_HYDRATE_MAX_ROUNDS && pendingIds.length > 0) {
    console.warn(
      'useMenu: stopped menu parent hydration after max rounds; missing parents:',
      pendingIds.length,
    )
  }

  const menuRows = [...menuMap.values()]
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
  return {
    items: items.length > 0 ? items : [],
    rawHierarchy: hierarchy,
    error: null,
    layoutHint,
    effectiveLayoutScope: effectiveLayoutPreference,
  }
}

async function fetchRoleMenuRowsForRoles(roleIds = []) {
  const ids = [...new Set(roleIds.filter(Boolean))]
  if (ids.length === 0) return { data: [], error: null }

  const chunks = chunkArray(ids, 40)
  const results = await Promise.all(
    chunks.map((chunk) =>
      platformDb
        .from('role_menu_items')
        .select('menu_item_id, can_use')
        .in('role_id', chunk)
        .eq('can_view', true)
        .eq('is_active', true)
        .eq('is_deleted', false),
    ),
  )

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
}

function useMenuProvider(layoutScopeProp = null) {
  const location = useLocation()
  const layoutScopeRef = useRef(layoutScopeProp)
  layoutScopeRef.current = layoutScopeProp
  const activeScopeRef = useRef(null)

  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [layoutHint, setLayoutHint] = useState(null)
  const hasLoadedRef    = useRef(false)
  const loadInFlightRef = useRef(null)
  const currentUserRef  = useRef(null)
  const moduleKeyRef    = useRef(null)

  /** Apply a fetched hierarchy to state, module-level store, and localStorage cache. */
  const applyFetchResult = (rawHierarchy, fetchedHint, userId, layoutScope) => {
    const hierarchy = Array.isArray(rawHierarchy) ? rawHierarchy : []
    const presentation = buildSidebarPresentation(hierarchy, fetchedHint)
    const finalItems = presentation.length > 0
      ? presentation
      : hierarchy.length > 0 ? stripVirtualMenuItems(hierarchy) : []
    if (presentation.length === 0 && hierarchy.length > 0) {
      console.warn('[useMenu] empty sidebar after transform; showing raw DB roots:', hierarchy.length)
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
    writeSidebarCache(userId, layoutScope, { items: finalItems, rawHierarchy: hierarchy, layoutHint: fetchedHint })
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
                const presentation = buildSidebarPresentation(quickCached.rawHierarchy, quickCached.layoutHint)
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
            const presentation = buildSidebarPresentation(cached.rawHierarchy, cached.layoutHint)
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
          applyFetchResult(rawHierarchy, fetchedHint, user.id, finalScope)
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
            applyFetchResult(cached.rawHierarchy, cached.layoutHint, user.id, layoutScope)
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
