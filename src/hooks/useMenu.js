import { useState, useEffect } from 'react'
import { platformDb } from '../services/supabaseClient'

const MENU_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function readCache(userId) {
  try {
    const raw = sessionStorage.getItem(`nidus_menu_${userId}`)
    if (!raw) return null
    const { items, at } = JSON.parse(raw)
    return Date.now() - at < MENU_CACHE_TTL ? items : null
  } catch { return null }
}

/** Returns cached menu items even if expired (for fallback when fetch fails). */
function readStaleCache(userId) {
  try {
    const raw = sessionStorage.getItem(`nidus_menu_${userId}`)
    if (!raw) return null
    const { items } = JSON.parse(raw)
    return Array.isArray(items) ? items : null
  } catch { return null }
}

function writeCache(userId, items) {
  try {
    sessionStorage.setItem(`nidus_menu_${userId}`, JSON.stringify({ items, at: Date.now() }))
  } catch { /* sessionStorage unavailable */ }
}

function buildHierarchy(accessibleMenus) {
  const menuMap = new Map()
  const rootMenus = []

  accessibleMenus?.forEach((rmi) => {
    const menu = rmi.menu_items
    if (!menu || !menu.is_visible || !menu.is_active) return
    menuMap.set(menu.id, { ...menu, canUse: rmi.can_use, children: [] })
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

// Pure DB fetch — returns { items, error }. No fallback; menu data is from DB only.
// Use two separate queries to avoid PostgREST "more than one relationship" embed error between users and user_roles.
async function fetchMenuFromDB(user) {
  const { data: userRow, error: userError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (userError || !userRow?.id) {
    const msg = userError?.message || 'User record not found'
    const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
    const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
    console.warn('useMenu: failed to load user:', msg)
    return { items: null, error: `Menu unavailable: ${friendly}` }
  }

  const { data: roleRows, error: rolesError } = await platformDb
    .from('user_roles')
    .select('role_id, is_active, is_deleted')
    .eq('user_id', userRow.id)
    .eq('is_active', true)

  if (rolesError) {
    console.warn('useMenu: failed to load user roles:', rolesError.message)
    return { items: null, error: `Menu unavailable: ${rolesError.message}. Please contact support if this persists.` }
  }

  const roleIds = (roleRows || [])
    .filter(ur => !ur.is_deleted)
    .map(ur => ur.role_id)

  if (roleIds.length === 0) {
    const msg = 'No roles assigned. Menu cannot be loaded.'
    console.warn('useMenu:', msg)
    return { items: null, error: msg }
  }

  const { data: accessibleMenus, error: menuError } = await platformDb
    .from('role_menu_items')
    .select(`
      menu_item_id,
      can_view,
      can_use,
      menu_items:menu_item_id (
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
      )
    `)
    .in('role_id', roleIds)
    .eq('can_view', true)
    .eq('is_active', true)
    .eq('is_deleted', false)

  if (menuError) {
    const msg = menuError.message || ''
    const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
    const friendly = isNetwork ? 'Connection problem. Check your network and try again.' : msg
    console.error('useMenu: error fetching menu items:', menuError)
    return { items: null, error: friendly ? `Menu unavailable: ${friendly}` : 'Failed to load sidebar menu.' }
  }

  const items = buildHierarchy(accessibleMenus)
  return { items: items.length > 0 ? items : [], error: null }
}

export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    try {
      setError(null)

      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) {
        setMenuItems([])
        setLoading(false)
        return
      }

      const cached = readCache(user.id)
      if (cached) {
        setMenuItems(cached)
        setLoading(false)
        fetchMenuFromDB(user).then(({ items, error: fetchError }) => {
          if (fetchError) {
            setError(fetchError)
            return
          }
          if (items && items.length > 0) {
            writeCache(user.id, items)
            setMenuItems(items)
            setError(null)
          }
        }).catch((err) => {
          console.error('useMenu: background refresh failed', err)
          setError(err?.message || 'Failed to refresh menu')
        })
        return
      }

      setLoading(true)
      const { items, error: fetchError } = await fetchMenuFromDB(user)
      if (fetchError) {
        setError(fetchError)
        const stale = readStaleCache(user.id)
        setMenuItems(Array.isArray(stale) ? stale : [])
      } else {
        setMenuItems(items || [])
        if (items && items.length > 0) {
          writeCache(user.id, items)
        }
      }
    } catch (err) {
      const msg = err?.message || 'Failed to load sidebar menu'
      const isNetwork = /failed to fetch|network|load failed/i.test(String(msg))
      setError(isNetwork ? 'Connection problem. Check your network and try again.' : msg)
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (user?.id) {
          const stale = readStaleCache(user.id)
          if (Array.isArray(stale) && stale.length > 0) setMenuItems(stale)
          else setMenuItems([])
        } else setMenuItems([])
      } catch (_) {
        setMenuItems([])
      }
      console.error('useMenu error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { menuItems, loading, error, refetch: loadMenu }
}
