import { platformDb } from './supabase/supabaseClient'

const MENU_CACHE_KEY_PREFIX = 'nidus_menu_'

/** Same TTL as useMenu (for documentation); cache is cleared on save. */
export const MENU_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Clear sidebar menu cache so useMenu refetches on next navigation.
 * @param {string} authUserId - Supabase auth user id
 */
export function clearSidebarMenuCache(authUserId) {
  if (!authUserId) return
  try {
    sessionStorage.removeItem(`${MENU_CACHE_KEY_PREFIX}${authUserId}`)
  } catch {
    /* ignore */
  }
}

function isPlatformSidebarRoute(row) {
  const p = (row.route_path || '').trim()
  if (!p) return true
  if (p.startsWith('/simulator')) return false
  if (
    p.startsWith('/platform') ||
    p.startsWith('/pmo') ||
    p.startsWith('/pm') ||
    p.startsWith('/admin')
  ) {
    return true
  }
  return false
}

export function filterPlatformMenuItems(rows) {
  return (rows || []).filter((r) => isPlatformSidebarRoute(r))
}

export async function fetchAllRoles() {
  const { data, error } = await platformDb
    .from('roles')
    .select('id, role_name, role_display_name, role_level, is_system_role, is_active, is_deleted')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('role_level', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchFullMenuTree() {
  const { data, error } = await platformDb
    .from('menu_items')
    .select(
      'id, menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_system_menu, is_visible, is_active, is_deleted',
    )
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('is_visible', true)

  if (error) throw error
  return filterPlatformMenuItems(data || [])
}

export async function fetchRoleMenuAccess(roleId) {
  const { data, error } = await platformDb
    .from('role_menu_items')
    .select('id, menu_item_id, can_view, can_use, is_active')
    .eq('role_id', roleId)
    .eq('is_deleted', false)

  if (error) throw error
  const map = new Map()
  for (const row of data || []) {
    map.set(row.menu_item_id, {
      id: row.id,
      can_view: !!row.can_view,
      can_use: !!row.can_use,
      is_active: row.is_active !== false,
    })
  }
  return map
}

const SYSTEM_ADMIN_NAMES = new Set(['system_admin', 'System Admin'])

/**
 * @param {'pmo' | 'admin'} variant
 * @param {{ role_name: string, role_level: number }} targetRole
 * @param {{ isSystemAdmin: boolean, pmoRoleLevel: number | null }} editorCap
 */
export function assertCanEditTargetRole(variant, targetRole, editorCap) {
  if (!targetRole) throw new Error('No role selected')
  if (editorCap.isSystemAdmin) return

  if (variant === 'admin') {
    throw new Error('Only System Admin can use this page.')
  }

  if (SYSTEM_ADMIN_NAMES.has(targetRole.role_name)) {
    throw new Error('You cannot edit the System Admin role.')
  }

  const cap = editorCap.pmoRoleLevel
  if (cap == null) {
    throw new Error('PMO Admin access required.')
  }
  if (targetRole.role_level > cap) {
    throw new Error('You cannot edit a role above your authority level.')
  }
}

export function canAccessPmoRoleMenuPage(cap) {
  return !!(cap?.authenticated && (cap.isSystemAdmin || cap.pmoRoleLevel != null))
}

export function canAccessAdminRoleMenuPage(cap) {
  return !!(cap?.authenticated && cap.isSystemAdmin)
}

export async function saveRoleMenuAccess(roleId, changes, variant, targetRole, editorCap, menuMetaById) {
  assertCanEditTargetRole(variant, targetRole, editorCap)

  const rows = []
  for (const ch of changes) {
    const meta = menuMetaById?.get?.(ch.menu_item_id)
    if (meta?.is_system_menu) {
      throw new Error('System-protected menu items cannot be changed from the UI.')
    }
    const canUse = !!ch.can_use
    const canView = !!ch.can_view || canUse
    rows.push({
      role_id: roleId,
      menu_item_id: ch.menu_item_id,
      can_view: canView,
      can_use: canUse,
      is_active: true,
      is_deleted: false,
    })
  }

  if (rows.length === 0) return { success: true }

  const { error } = await platformDb.from('role_menu_items').upsert(rows, {
    onConflict: 'role_id,menu_item_id',
  })

  if (error) throw error
  return { success: true }
}

export async function fetchCurrentUserEditorCapabilities() {
  const { data: auth, error: authErr } = await platformDb.auth.getUser()
  if (authErr) throw authErr
  const user = auth?.user
  if (!user) {
    return {
      authenticated: false,
      authUserId: null,
      isSystemAdmin: false,
      pmoRoleLevel: null,
    }
  }

  const { data: appUser, error: uErr } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (uErr) throw uErr
  if (!appUser?.id) {
    return {
      authenticated: true,
      authUserId: user.id,
      isSystemAdmin: false,
      pmoRoleLevel: null,
    }
  }

  const { data: urRows, error: rErr } = await platformDb
    .from('user_roles')
    .select('role_id')
    .eq('user_id', appUser.id)
    .eq('is_active', true)
    .eq('is_deleted', false)

  if (rErr) throw rErr

  const roleIds = [...new Set((urRows || []).map((r) => r.role_id).filter(Boolean))]
  let isSystemAdmin = false
  let pmoRoleLevel = null

  if (roleIds.length > 0) {
    const { data: roleRows, error: roleErr } = await platformDb
      .from('roles')
      .select('role_name, role_level')
      .in('id', roleIds)

    if (roleErr) throw roleErr

    for (const r of roleRows || []) {
      const name = r?.role_name
      const lvl = typeof r?.role_level === 'number' ? r.role_level : null
      if (
        name &&
        ['system_admin', 'System Admin', 'super_admin', 'Super Admin'].includes(name)
      ) {
        isSystemAdmin = true
      }
      if (name && ['pmo_admin', 'PMO Admin'].includes(name)) {
        if (lvl != null) {
          pmoRoleLevel = pmoRoleLevel == null ? lvl : Math.max(pmoRoleLevel, lvl)
        }
      }
    }
  }

  return {
    authenticated: true,
    authUserId: user.id,
    isSystemAdmin,
    pmoRoleLevel,
  }
}
