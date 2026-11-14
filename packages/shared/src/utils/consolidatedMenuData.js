/**
 * Consolidated role menus (v1341) — data loading for the pure engine in
 * `@nidus/config/consolidatedMenu.js`. Shared by Platform and Simulator (`app` picks the
 * section rows and the per-project switch-off table).
 *
 * Performance (rule 66, R6): the switch, version stamp, project context and user roles load in
 * one Promise.all; sections / slots / placements / defaults are cached in sessionStorage per
 * app + placement key + version stamp, so a warm load adds no round trip beyond the parallel batch.
 * Cache refresh (R5): any placement / section / slot / default-section write bumps
 * `menu_placement_version`, which changes the cache key.
 */
import { platformDb, simDb } from '@nidus/supabase'
import { buildConsolidatedMenu, resolvePlacementKey, COMPACT_PLACEMENT_KEYS } from '@nidus/config/consolidatedMenu'

const BUNDLE_CACHE_PREFIX = 'nidus:menuPlacements:'
const PAGE_SIZE = 1000

/** Event the app fires after anything that changes a project's menu (switch-off, industries). */
export const MENU_CONTEXT_CHANGED_EVENT = 'nidus-menu-context-changed'

export function notifyMenuContextChanged() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(MENU_CONTEXT_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

function readBundleCache(key) {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeBundleCache(key, value) {
  try {
    if (typeof sessionStorage === 'undefined') return
    // One bundle per app + placement key: drop older versions.
    const prefix = key.slice(0, key.lastIndexOf(':') + 1)
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i)
      if (k && k !== key && k.startsWith(prefix)) sessionStorage.removeItem(k)
    }
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — next load fetches again
  }
}

async function fetchAllPages(build) {
  const rows = []
  let offset = 0
  for (;;) {
    const { data, error } = await build().range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += batch.length
  }
  return rows
}

const SWITCH_CACHE_PREFIX = 'nidus:menuSwitch:'
const SWITCH_CACHE_TTL_MS = 2 * 60 * 1000

/**
 * Is the consolidated sidebar switched on for this organisation (D11 / D20)?
 * Cached for two minutes per account so organisations with the switch off keep today's
 * sidebar path with at most one small query per two minutes (rule 66).
 */
export async function isConsolidatedMenuEnabled(accountId, { force = false } = {}) {
  if (!accountId) return false
  const cacheKey = `${SWITCH_CACHE_PREFIX}${accountId}`
  if (!force) {
    const cached = readBundleCache(cacheKey)
    if (cached && Date.now() - cached.at < SWITCH_CACHE_TTL_MS) return !!cached.enabled
  }
  const { data, error } = await platformDb
    .from('account_menu_settings')
    .select('consolidated_menu_enabled')
    .eq('account_id', accountId)
    .maybeSingle()
  const enabled = error ? false : !!data?.consolidated_menu_enabled // no table yet → today's sidebar
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(cacheKey, JSON.stringify({ enabled, at: Date.now() }))
  } catch {
    // ignore
  }
  return enabled
}

/** Forget the cached switch (e.g. after a menu context change). */
export function clearConsolidatedMenuSwitchCache() {
  try {
    if (typeof sessionStorage === 'undefined') return
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(SWITCH_CACHE_PREFIX)) sessionStorage.removeItem(k)
    }
  } catch {
    // ignore
  }
}

async function loadPlacementVersion() {
  const { data, error } = await platformDb.from('menu_placement_version').select('version').eq('id', 1).maybeSingle()
  if (error) return null
  return data?.version ?? null
}

/** Sections, slots, placements for one key, and default sections — cached per version. */
export async function loadPlacementBundle(app, placementKey, version) {
  const cacheKey = `${BUNDLE_CACHE_PREFIX}${app}:${placementKey}:${version ?? 'none'}`
  const cached = version != null ? readBundleCache(cacheKey) : null
  if (cached) return cached

  const [sectionsRes, slotsRes, placements, defaults] = await Promise.all([
    platformDb.from('menu_sections').select('section_code, label, icon, sort_order, is_footer, overflow_label, is_active').eq('app', app),
    platformDb.from('menu_slots').select('slot_key, label, section_code, sort_order, is_active').eq('app', app),
    fetchAllPages(() => platformDb
      .from('menu_item_placements')
      .select('menu_item_id, section_code, parent_menu_item_id, slot_key, sort_order, scope, is_active')
      .eq('placement_key', placementKey)
      .eq('is_active', true)
      .order('id', { ascending: true })),
    fetchAllPages(() => platformDb
      .from('menu_items')
      .select('id, default_section_code')
      .not('default_section_code', 'is', null)
      .order('id', { ascending: true })),
  ])
  if (sectionsRes.error) throw sectionsRes.error
  if (slotsRes.error) throw slotsRes.error

  // Consolidated-only catalogue rows (is_visible = FALSE, e.g. the Project Settings sub-menu and
  // Industry Modules): hidden from today's sidebar, shown only where a placement puts them.
  const placedIds = [...new Set(placements.flatMap((p) => [p.menu_item_id, p.parent_menu_item_id]).filter(Boolean))]
  const extraItems = []
  for (let i = 0; i < placedIds.length; i += 100) {
    const { data } = await platformDb
      .from('menu_items')
      .select('id, menu_code, menu_label, menu_icon, route_path')
      .in('id', placedIds.slice(i, i + 100))
      .eq('is_visible', false)
      .eq('is_active', true)
    extraItems.push(...(data || []))
  }

  const bundle = {
    sections: sectionsRes.data || [],
    slots: slotsRes.data || [],
    placements,
    defaults: defaults.map((d) => [d.id, d.default_section_code]),
    extraItems,
  }
  if (version != null) writeBundleCache(cacheKey, bundle)
  return bundle
}

/** The open project's industries (primary first) and switched-off items. */
export async function loadProjectMenuContext(app, projectId) {
  if (!projectId) return { industries: [], disabledItemIds: [] }
  if (app === 'simulator') {
    const [indRes, offRes] = await Promise.all([
      simDb.from('practice_project_industries').select('industry_category_id, is_primary, added_at').eq('practice_project_id', projectId),
      simDb.from('practice_project_disabled_menu_items').select('menu_item_id').eq('practice_project_id', projectId),
    ])
    return {
      industries: orderIndustries(indRes.data || [], 'added_at'),
      disabledItemIds: offRes.error ? [] : (offRes.data || []).map((r) => r.menu_item_id),
    }
  }
  const [indRes, offRes, projRes] = await Promise.all([
    platformDb.from('project_industries').select('industry_category_id, is_primary, created_at').eq('project_id', projectId),
    platformDb.from('project_disabled_menu_items').select('menu_item_id').eq('project_id', projectId),
    platformDb.from('projects').select('industry_category_id').eq('id', projectId).maybeSingle(),
  ])
  let industries = orderIndustries(indRes.error ? [] : (indRes.data || []), 'created_at')
  if (industries.length === 0 && projRes.data?.industry_category_id) {
    industries = [{ industry_category_id: projRes.data.industry_category_id, is_primary: true }]
  }
  return {
    industries,
    disabledItemIds: offRes.error ? [] : (offRes.data || []).map((r) => r.menu_item_id),
  }
}

function orderIndustries(rows, dateKey) {
  return [...rows].sort((a, b) =>
    Number(!!b.is_primary) - Number(!!a.is_primary) || String(a[dateKey] || '').localeCompare(String(b[dateKey] || '')))
}

/** The user's roles with project scope and custom-role "menu based on" (D25, D26). */
export async function loadUserMenuRoles(authUserId) {
  if (!authUserId) return []
  const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle()
  if (!userRow?.id) return []
  const { data: urRows, error } = await platformDb
    .from('user_roles')
    .select('role_id, project_id, is_deleted')
    .eq('user_id', userRow.id)
    .eq('is_active', true)
  if (error) return []
  const rows = (urRows || []).filter((r) => !r.is_deleted && r.role_id)
  if (rows.length === 0) return []
  const ids = [...new Set(rows.map((r) => r.role_id))]
  let roleRes = await platformDb.from('roles').select('id, role_name, account_id, menu_layout_key').in('id', ids)
  if (roleRes.error) {
    // menu_layout_key arrives with SQL v1456 (D25); before that, built-in mapping only.
    roleRes = await platformDb.from('roles').select('id, role_name, account_id').in('id', ids)
  }
  const byId = new Map((roleRes.data || []).map((r) => [r.id, r]))
  return rows
    .map((r) => ({ ...(byId.get(r.role_id) || {}), project_id: r.project_id || null }))
    .filter((r) => r.role_name)
}

function collectIds(nodes, idToCode) {
  for (const n of nodes || []) {
    if (n?.id && n?.menu_code) idToCode.set(n.id, n.menu_code)
    collectIds(n?.children, idToCode)
  }
  return idToCode
}

/**
 * Build the consolidated sidebar for the current user. Call only when
 * `isConsolidatedMenuEnabled(accountId)` is true.
 * @param {{
 *   app: 'platform'|'simulator',
 *   tree: object[],                 finished role-filtered tree (before pack grouping)
 *   accountId: string|null,
 *   authUserId: string|null,
 *   layout: 'pm'|'tm'|'pmo'|null,
 *   projectId: string|null,         open project (practice project in the Simulator)
 *   packMap: Promise|{ sections: Array<{packId, industryCategoryId, packName, isPrimary}>, menuCodeToPack: Map }|null,
 *                                   every organisation industry (unrestricted); may be a promise so it
 *                                   loads in the same parallel batch (R6)
 * }} input
 */
export async function buildConsolidatedMenuForUser({ app, tree, accountId, authUserId, layout, projectId, packMap }) {
  if (!accountId || !Array.isArray(tree) || tree.length === 0) return { enabled: false }
  const [version, projectCtx, roles, packMapResolved] = await Promise.all([
    loadPlacementVersion(),
    loadProjectMenuContext(app, projectId).catch(() => ({ industries: [], disabledItemIds: [] })),
    loadUserMenuRoles(authUserId).catch(() => []),
    Promise.resolve(packMap).catch(() => null),
  ])

  const { key, homeOnly } = resolvePlacementKey({ layout, roles, projectId, projectOpen: !!projectId })
  const bundle = await loadPlacementBundle(app, key, version)

  const idToCode = collectIds(tree, new Map())
  const extraNodes = (bundle.extraItems || [])
    .filter((m) => m?.id && m?.menu_code && !idToCode.has(m.id))
    .map((m) => ({ id: m.id, menu_code: m.menu_code, menu_label: m.menu_label, menu_icon: m.menu_icon, route_path: m.route_path, children: [] }))
  for (const m of extraNodes) idToCode.set(m.id, m.menu_code)
  const fullTree = extraNodes.length > 0 ? [...tree, ...extraNodes] : tree
  const placements = bundle.placements
    .map((p) => ({
      ...p,
      menu_code: idToCode.get(p.menu_item_id) || null,
      parent_code: p.parent_menu_item_id ? idToCode.get(p.parent_menu_item_id) || null : null,
    }))
    .filter((p) => p.menu_code)
  const defaultSectionByCode = new Map(
    bundle.defaults.map(([id, section]) => [idToCode.get(id), section]).filter(([code]) => !!code),
  )
  const disabledCodes = new Set(projectCtx.disabledItemIds.map((id) => idToCode.get(id)).filter(Boolean))

  const packSections = packMapResolved?.sections || []
  const packByIndustry = new Map(packSections.map((s) => [s.industryCategoryId, s.packId]))
  const allowedPackIds = projectCtx.industries.map((r) => packByIndustry.get(r.industry_category_id)).filter(Boolean)
  const organisationPackIds = [...packSections]
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))
    .map((s) => s.packId)
  const includeOrganisationScope = layout === 'pmo' || key === 'portfolio' || key === 'programme'

  const result = buildConsolidatedMenu({
    tree: fullTree,
    sections: bundle.sections,
    slots: bundle.slots,
    placements,
    defaultSectionByCode,
    packOfCode: packMapResolved?.menuCodeToPack || new Map(),
    allowedPackIds,
    organisationPackIds,
    includeOrganisationScope,
    disabledCodes,
    homeOnly,
    useDefaults: !COMPACT_PLACEMENT_KEYS.has(key),
  })

  return {
    enabled: true,
    placementKey: key,
    homeOnly,
    projectId: projectId || null,
    version,
    items: result.items,
    slotTabs: result.slotTabs,
    pageIndex: result.pageIndex,
    unplaced: result.unplaced,
    packNames: packSections.map((s) => [s.packId, s.packName]),
  }
}
