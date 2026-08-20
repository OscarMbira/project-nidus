/**
 * Organisation Custom Role Service
 * "Manage Roles" feature (v902) — lets PMO Admin / Portfolio Manager / Programme Manager /
 * Project Manager / Team Manager create, edit, deactivate, and delete organisation-wide
 * custom roles by cloning an existing role's permissions and sidebar menu grants.
 *
 * All writes go through SECURITY DEFINER RPCs (SQL/v903_organisation_custom_roles_rpcs.sql) —
 * roles/project_roles/role_menu_items stay RLS-restricted for direct client writes (rule 42:
 * do not bypass RLS as a workaround). This service only reads directly and calls RPCs to write.
 */

import { supabase } from './supabaseClient'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'

/**
 * Resolves the current user's organisation and checks the SAME server-side authorization
 * (`user_can_manage_org_roles`) the write RPCs enforce — used client-side to gate the
 * "Manage Roles" UI itself (show/hide Create/Edit/Delete) without duplicating the 5-role
 * eligibility logic in JS.
 * @returns {Promise<{success: boolean, accountId: string|null, canManage: boolean, error: string|null}>}
 */
export async function getManageRolesAccess() {
  try {
    // accountId and the auth user are independent lookups — resolving them in parallel
    // instead of one-after-another cuts this function's critical path by one round trip.
    const [accountId, {
      data: { user },
    }] = await Promise.all([getCurrentUserAccountId(), supabase.auth.getUser()])
    if (!accountId) {
      return { success: true, accountId: null, canManage: false, error: null }
    }
    if (!user) {
      return { success: true, accountId, canManage: false, error: null }
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!userRow?.id) {
      return { success: true, accountId, canManage: false, error: null }
    }

    const { data, error } = await supabase.rpc('user_can_manage_org_roles', {
      p_user_id: userRow.id,
      p_account_id: accountId,
    })

    if (error) throw error
    return { success: true, accountId, canManage: !!data, error: null }
  } catch (error) {
    console.error('getManageRolesAccess:', error)
    return { success: false, accountId: null, canManage: false, error: error.message || 'Failed to check access' }
  }
}

/**
 * Built-in roles (account_id IS NULL) + this organisation's own active custom roles —
 * the full set a user can pick as a clone source, or see in "Manage Roles".
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getCloneSourceRoles(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }

    const { data, error } = await supabase
      .from('project_roles')
      .select(
        'id, role_name, role_display_name, role_description, role_level, is_governance_only, account_id, ' +
        'is_active, created_at, updated_at, ' +
        'industry_category_id, industry_category:industry_categories(id, name)'
      )
      .eq('is_template', true)
      .eq('is_active', true)
      .or(`account_id.is.null,account_id.eq.${accountId}`)
      .order('role_level', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getCloneSourceRoles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load roles' }
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROLE_BY_ID_SELECT =
  'id, role_name, role_display_name, role_description, role_level, is_governance_only, account_id, ' +
  'is_active, created_at, updated_at, ' +
  'industry_category_id, industry_category:industry_categories(id, name)'

/**
 * A single role (built-in or custom) by its friendly `role_name` slug (e.g. "qa_test_lead") —
 * or, for backward compatibility, its raw UUID (rule 16.1). Used by the non-modal role
 * detail/edit page (v910), which resolves its subject from the `:id` route param.
 * Custom role_name is only unique per-organisation, so a role_name that isn't a built-in is
 * resolved against the caller's own account.
 * @param {string} idOrRoleName
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getRoleById(idOrRoleName) {
  try {
    if (!idOrRoleName) return { success: false, data: null, error: 'Missing role id' }

    if (UUID_RE.test(idOrRoleName)) {
      const { data, error } = await supabase
        .from('project_roles')
        .select(ROLE_BY_ID_SELECT)
        .eq('id', idOrRoleName)
        .eq('is_template', true)
        .maybeSingle()
      if (error) throw error
      if (!data) return { success: false, data: null, error: 'Role not found' }
      return { success: true, data, error: null }
    }

    const { data: builtIn, error: builtInErr } = await supabase
      .from('project_roles')
      .select(ROLE_BY_ID_SELECT)
      .eq('role_name', idOrRoleName)
      .eq('is_template', true)
      .is('account_id', null)
      .maybeSingle()
    if (builtInErr) throw builtInErr
    if (builtIn) return { success: true, data: builtIn, error: null }

    const accountId = await getCurrentUserAccountId()
    if (accountId) {
      const { data: custom, error: customErr } = await supabase
        .from('project_roles')
        .select(ROLE_BY_ID_SELECT)
        .eq('role_name', idOrRoleName)
        .eq('is_template', true)
        .eq('account_id', accountId)
        .maybeSingle()
      if (customErr) throw customErr
      if (custom) return { success: true, data: custom, error: null }
    }

    return { success: false, data: null, error: 'Role not found' }
  } catch (error) {
    console.error('getRoleById:', error)
    return { success: false, data: null, error: error.message || 'Failed to load role' }
  }
}

/**
 * Active industry categories (v906) — used to populate the Built-in Roles industry filter.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getIndustryCategories() {
  try {
    const { data, error } = await supabase
      .from('industry_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getIndustryCategories:', error)
    return { success: false, data: [], error: error.message || 'Failed to load industry categories' }
  }
}

/**
 * Active industry segments (v918) for one industry category — optional sub-industry choice
 * shown during registration once the user has selected that industry.
 * @param {string} industryCategoryId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getIndustrySegments(industryCategoryId) {
  if (!industryCategoryId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('industry_segments')
      .select('id, name, description')
      .eq('industry_category_id', industryCategoryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getIndustrySegments:', error)
    return { success: false, data: [], error: error.message || 'Failed to load industry segments' }
  }
}

/**
 * This organisation's own custom roles (built-in roles are shown separately, read-only).
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrgCustomRoles(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }

    const { data, error } = await supabase
      .from('project_roles')
      .select('id, role_name, role_display_name, role_description, role_level, is_governance_only, is_active, account_id, created_at, updated_at')
      .eq('is_template', true)
      .eq('account_id', accountId)
      .order('role_display_name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getOrgCustomRoles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load custom roles' }
  }
}

/**
 * Menu items currently granted to a role's paired `roles` row — used to build the
 * clone-preview / deselect checklist. Resolves the paired roles.id by role_name first.
 * @param {string} roleName
 * @param {string|null} accountId - null when the source is a built-in role
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getRoleMenuGrants(roleName, accountId = null) {
  try {
    if (!roleName) return { success: false, data: [], error: 'Missing role name' }

    let roleQuery = supabase.from('roles').select('id').eq('role_name', roleName).eq('is_active', true)
    roleQuery = accountId ? roleQuery.eq('account_id', accountId) : roleQuery.is('account_id', null)
    const { data: roleRow, error: roleErr } = await roleQuery.maybeSingle()
    if (roleErr) throw roleErr
    if (!roleRow?.id) return { success: true, data: [], error: null }

    const { data, error } = await supabase
      .from('role_menu_items')
      .select('menu_item_id, can_view, can_use, menu_item:menu_items(id, menu_label, route_path, parent_menu_id)')
      .eq('role_id', roleRow.id)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error) throw error

    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getRoleMenuGrants:', error)
    return { success: false, data: [], error: error.message || 'Failed to load menu grants' }
  }
}

/**
 * Roles the current user is allowed to assign to someone else — built-in + this org's custom
 * roles, capped at the caller's own highest project-tier role_level (v906/v908). Org-wide admin
 * tiers (PMO Admin, System Admin, etc.) see the full catalog. Single source of truth for every
 * role-picker surface (Assign Roles, invitations, bulk invite, edit member role).
 * @param {string|null} [projectId] - scope the level cap to one project; omit for the caller's
 *   highest level across all their projects.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAssignableProjectRoles(projectId = null) {
  try {
    const accountId = await getCurrentUserAccountId()
    if (!accountId) return { success: false, data: [], error: 'Could not resolve your organisation' }

    const { data, error } = await supabase.rpc('get_assignable_project_roles', {
      p_account_id: accountId,
      p_project_id: projectId,
    })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getAssignableProjectRoles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load assignable roles' }
  }
}

/**
 * The full menu-item universe a project-tier custom role can plausibly need (v912) — every
 * distinct menu item currently granted to ANY built-in role. Powers the from-scratch Create
 * Role checklist so the admin isn't shown System Administration / Billing / etc. items no
 * project role would ever use.
 *
 * Menu-schema history means the SAME functional item is often seeded under more than one
 * `menu_items` row (legacy section-header revamps, per-layout/per-tier duplicates like a
 * Simulator variant with a different query string) sharing an identical label. These are
 * deduped into one checklist row **by label** — an admin picking sidebar access for a role
 * thinks in terms of "Agile," not which of 3 near-identical query-string variants of it exists,
 * so the row's technical route is never shown either. Each returned row carries `ids` — every
 * underlying `menu_items.id` the label represents — so checking one box grants all of them.
 *
 * Each row also carries `category` (its immediate parent's label, or `null` for a top-level
 * item/category itself) and `isCategory` (true when the row has no `route_path` — a pure group
 * header, not a clickable page) — the sidebar-preview panel groups selections by `category` so
 * a checked category like "People & Resources" reads as a section, not a random flat entry.
 * A section's real children are always included here (fetched directly from `menu_items` by
 * `parent_menu_id`), even a child with no grant of its own to a built-in role — otherwise
 * checking the section alone would offer an empty, non-functional heading.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
// This is the same, rarely-changing data (every menu item any built-in role can grant) fetched
// fresh by Create/Edit Role AND Create/Edit Menu Bundle every time any of those four pages
// loads — a real cost, since it's a several-round-trip chain (see below). Admins routinely
// bounce between these pages in one sitting (build a bundle, then a role, then another role),
// so caching turns every load after the first into an instant return instead of repeating the
// whole fetch. Backed by sessionStorage, not just an in-memory variable — a hard reload (a
// fresh navigation, not an SPA route change) wipes all JS module state, and that's a normal
// part of how this gets exercised in practice (not just an in-app click-through), so an
// in-memory-only cache would rarely actually hit. Same sessionStorage pattern already used for
// account id caching in accountResolution.js. Not account-scoped (builtin role grants are the
// same for every organisation), so one fixed key covers everyone. In-flight de-dupe collapses
// concurrent callers (e.g. two components mounting in the same tick) onto one shared request,
// same pattern as getCurrentUserInternalUserId() in accountResolution.js.
const GRANTABLE_MENU_ITEMS_CACHE_TTL_MS = 5 * 60 * 1000
const GRANTABLE_MENU_ITEMS_SESSION_KEY = 'nidus:grantableMenuItems:v1'
let _grantableMenuItemsInFlight = null

function readGrantableMenuItemsSessionCache() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(GRANTABLE_MENU_ITEMS_SESSION_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry?.cachedAt || !Array.isArray(entry?.data)) return null
    if (Date.now() - entry.cachedAt >= GRANTABLE_MENU_ITEMS_CACHE_TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

function writeGrantableMenuItemsSessionCache(data) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(GRANTABLE_MENU_ITEMS_SESSION_KEY, JSON.stringify({ cachedAt: Date.now(), data }))
  } catch {
    // Storage full or unavailable — ignore; next load just fetches from DB.
  }
}

export function invalidateGrantableMenuItemsCache() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(GRANTABLE_MENU_ITEMS_SESSION_KEY)
  } catch {
    // ignore
  }
}

export async function getGrantableMenuItems() {
  const cached = readGrantableMenuItemsSessionCache()
  if (cached) return { success: true, data: cached, error: null }
  if (_grantableMenuItemsInFlight) return _grantableMenuItemsInFlight

  _grantableMenuItemsInFlight = _fetchGrantableMenuItems().then((result) => {
    if (result.success) writeGrantableMenuItemsSessionCache(result.data)
    return result
  }).finally(() => {
    _grantableMenuItemsInFlight = null
  })

  return _grantableMenuItemsInFlight
}

async function _fetchGrantableMenuItems() {
  try {
    const { data: builtinRoles, error: rolesErr } = await supabase
      .from('roles')
      .select('id')
      .is('account_id', null)
      .eq('is_active', true)
    if (rolesErr) throw rolesErr

    const roleIds = (builtinRoles || []).map((r) => r.id)
    if (roleIds.length === 0) return { success: true, data: [], error: null }

    const { data, error } = await supabase
      .from('role_menu_items')
      .select('menu_item_id, menu_item:menu_items(id, menu_label, route_path, parent_menu_id, is_active, is_visible)')
      .in('role_id', roleIds)
      .eq('is_active', true)
      .eq('is_deleted', false)
    if (error) throw error

    const seen = new Map()
    const addItem = (mi) => {
      if (!mi || !mi.is_active || !mi.is_visible) return
      const key = String(mi.menu_label || '').trim().toLowerCase()
      if (!key) return
      const existing = seen.get(key)
      if (existing) {
        if (!existing.ids.includes(mi.id)) existing.ids.push(mi.id)
      } else {
        seen.set(key, {
          id: mi.id,
          ids: [mi.id],
          menu_label: mi.menu_label,
          route_path: mi.route_path,
          parentMenuId: mi.parent_menu_id,
          isCategory: !mi.route_path,
        })
      }
    }
    for (const row of data || []) addItem(row.menu_item)

    // A section (category-type row, no route_path) is only useful with the sub-items beneath
    // it — pull in every real child of a granted section directly from menu_items, even one
    // that has no explicit role_menu_items grant of its own to a built-in role, so the picker
    // and preview reflect the section's true hierarchy instead of being limited to whichever
    // individual children happen to carry their own separate grant.
    const categoryItems = [...seen.values()].filter((v) => v.isCategory)
    let categoryIds = categoryItems.flatMap((v) => v.ids)
    // Some sections still have more than one menu_items row sharing the same label (legacy
    // layout/tier duplicates — see v725_dedupe_people_resources_menus.sql) even though only
    // one of those rows has its own role_menu_items grant. Children hang off whichever
    // duplicate row is their actual parent, so re-resolve every row for the granted label —
    // not just the id(s) that happened to carry a grant — before fetching children.
    const categoryLabels = categoryItems.map((v) => v.menu_label)
    if (categoryLabels.length > 0) {
      const { data: categoryRows, error: categoryRowsErr } = await supabase
        .from('menu_items')
        .select('id, menu_label')
        .in('menu_label', categoryLabels)
        .is('route_path', null)
        .eq('is_active', true)
        .eq('is_deleted', false)
      if (categoryRowsErr) throw categoryRowsErr
      categoryIds = [...new Set([...categoryIds, ...(categoryRows || []).map((r) => r.id)])]
    }
    if (categoryIds.length > 0) {
      const { data: children, error: childrenErr } = await supabase
        .from('menu_items')
        .select('id, menu_label, route_path, parent_menu_id, is_active, is_visible')
        .in('parent_menu_id', categoryIds)
        .eq('is_active', true)
        .eq('is_visible', true)
        .eq('is_deleted', false)
      if (childrenErr) throw childrenErr
      for (const child of children || []) addItem(child)
    }

    const parentIds = [...new Set([...seen.values()].map((v) => v.parentMenuId).filter(Boolean))]
    let parentLabels = new Map()
    if (parentIds.length > 0) {
      const { data: parents, error: parentsErr } = await supabase
        .from('menu_items')
        .select('id, menu_label')
        .in('id', parentIds)
      if (parentsErr) throw parentsErr
      parentLabels = new Map((parents || []).map((p) => [p.id, p.menu_label]))
    }

    const items = [...seen.values()]
      .map(({ parentMenuId, ...rest }) => ({
        ...rest,
        category: parentMenuId ? parentLabels.get(parentMenuId) || null : null,
      }))
      .sort((a, b) =>
        String(a.menu_label || '').localeCompare(String(b.menu_label || ''), undefined, { sensitivity: 'base' }),
      )
    return { success: true, data: items, error: null }
  } catch (error) {
    console.error('getGrantableMenuItems:', error)
    return { success: false, data: [], error: error.message || 'Failed to load menu items' }
  }
}

/**
 * Creates a new organisation-wide custom role — either from scratch (pick a level + menu
 * items directly, v912, the default the UI now uses since built-in roles are unchangeable and
 * a required clone step read as editing them by proxy) or by cloning an existing role
 * (`cloneFromProjectRoleId`, kept for any future reuse).
 * @param {object} params
 * @param {string} params.displayName
 * @param {string} [params.description]
 * @param {string} [params.cloneFromProjectRoleId] - omit for from-scratch mode
 * @param {boolean} [params.isGovernanceOnly]
 * @param {string[]} [params.excludedMenuItemIds] - clone mode only
 * @param {number} [params.roleLevel] - from-scratch mode only, defaults to 4
 * @param {string[]} [params.menuItemIds] - from-scratch mode only
 * @returns {Promise<{success: boolean, data: {projectRoleId: string, roleId: string}|null, error: string|null}>}
 */
export async function createOrgCustomRole({
  displayName,
  description = null,
  cloneFromProjectRoleId = null,
  isGovernanceOnly = false,
  excludedMenuItemIds = [],
  roleLevel = 4,
  menuItemIds = [],
}) {
  try {
    const accountId = await getCurrentUserAccountId()
    if (!accountId) throw new Error('Could not resolve your organisation')

    const { data, error } = await supabase.rpc('create_org_custom_role', {
      p_account_id: accountId,
      p_display_name: displayName,
      p_description: description,
      p_clone_from_project_role_id: cloneFromProjectRoleId,
      p_is_governance_only: isGovernanceOnly,
      p_excluded_menu_item_ids: excludedMenuItemIds,
      p_role_level: roleLevel,
      p_menu_item_ids: menuItemIds,
    })

    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data

    return {
      success: true,
      data: { projectRoleId: row?.project_role_id, roleId: row?.role_id },
      error: null,
    }
  } catch (error) {
    console.error('createOrgCustomRole:', error)
    return { success: false, data: null, error: error.message || 'Failed to create role' }
  }
}

/**
 * @param {object} params
 * @param {string} params.projectRoleId
 * @param {string} params.displayName
 * @param {string} [params.description]
 * @param {boolean} params.isGovernanceOnly
 * @param {string[]} [params.addMenuItemIds]
 * @param {string[]} [params.removeMenuItemIds]
 */
export async function updateOrgCustomRole({
  projectRoleId,
  displayName,
  description = null,
  isGovernanceOnly,
  addMenuItemIds = [],
  removeMenuItemIds = [],
}) {
  try {
    const { error } = await supabase.rpc('update_org_custom_role', {
      p_project_role_id: projectRoleId,
      p_display_name: displayName,
      p_description: description,
      p_is_governance_only: isGovernanceOnly,
      p_add_menu_item_ids: addMenuItemIds,
      p_remove_menu_item_ids: removeMenuItemIds,
    })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateOrgCustomRole:', error)
    return { success: false, error: error.message || 'Failed to update role' }
  }
}

/** @param {string} projectRoleId */
export async function deactivateOrgCustomRole(projectRoleId) {
  try {
    const { error } = await supabase.rpc('deactivate_org_custom_role', { p_project_role_id: projectRoleId })
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deactivateOrgCustomRole:', error)
    return { success: false, error: error.message || 'Failed to deactivate role' }
  }
}

/** @param {string} projectRoleId */
export async function deleteOrgCustomRole(projectRoleId) {
  try {
    const { error } = await supabase.rpc('delete_org_custom_role', { p_project_role_id: projectRoleId })
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteOrgCustomRole:', error)
    return { success: false, error: error.message || 'Failed to delete role' }
  }
}

/**
 * TRUE if the current user holds system_admin/super_admin (v910) — the platform-operator tier
 * that may edit the shared built-in role catalog. Client-side gate for the System Role Catalog
 * page; `update_builtin_role` enforces the same check server-side regardless.
 * @returns {Promise<boolean>}
 */
export async function isSystemAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!userRow?.id) return false

    const { data, error } = await supabase.rpc('is_system_admin_user', { p_user_id: userRow.id })
    if (error) throw error
    return !!data
  } catch (error) {
    console.error('isSystemAdmin:', error)
    return false
  }
}

/**
 * system_admin/super_admin-only edit of a built-in role (v910) — display name, description,
 * level, industry, governance flag, and menu grants. `role_name` is never editable.
 * @param {object} params
 * @param {string} params.projectRoleId
 * @param {string} params.displayName
 * @param {string} [params.description]
 * @param {number} params.roleLevel
 * @param {string|null} [params.industryCategoryId]
 * @param {boolean} params.isGovernanceOnly
 * @param {string[]} [params.addMenuItemIds]
 * @param {string[]} [params.removeMenuItemIds]
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateBuiltinRole({
  projectRoleId,
  displayName,
  description = null,
  roleLevel,
  industryCategoryId = null,
  isGovernanceOnly,
  addMenuItemIds = [],
  removeMenuItemIds = [],
}) {
  try {
    const { error } = await supabase.rpc('update_builtin_role', {
      p_project_role_id: projectRoleId,
      p_display_name: displayName,
      p_description: description,
      p_role_level: roleLevel,
      p_industry_category_id: industryCategoryId,
      p_is_governance_only: isGovernanceOnly,
      p_add_menu_item_ids: addMenuItemIds,
      p_remove_menu_item_ids: removeMenuItemIds,
    })

    if (error) throw error
    // Built-in role menu grants are exactly what getGrantableMenuItems() sources its "everything
    // any built-in role can grant" pool from — invalidate so Create Role/Bundle don't serve a
    // stale cached pool for the rest of the TTL after a system_admin changes it here.
    invalidateGrantableMenuItemsCache()
    return { success: true, error: null }
  } catch (error) {
    console.error('updateBuiltinRole:', error)
    return { success: false, error: error.message || 'Failed to update role' }
  }
}

export default {
  getManageRolesAccess,
  getCloneSourceRoles,
  getOrgCustomRoles,
  getRoleMenuGrants,
  getAssignableProjectRoles,
  getIndustryCategories,
  getIndustrySegments,
  getRoleById,
  getGrantableMenuItems,
  createOrgCustomRole,
  updateOrgCustomRole,
  deactivateOrgCustomRole,
  deleteOrgCustomRole,
  isSystemAdmin,
  updateBuiltinRole,
}
