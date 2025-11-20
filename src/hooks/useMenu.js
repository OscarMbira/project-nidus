import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMenuItems([])
        setLoading(false)
        return
      }

      // Get user's roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (rolesError) throw rolesError

      if (!userRoles || userRoles.length === 0) {
        // No roles assigned, return empty menu
        setMenuItems([])
        setLoading(false)
        return
      }

      const roleIds = userRoles.map(ur => ur.role_id)

      // Fetch menu items accessible to user's roles
      // Get menu items that are visible and active, and accessible to at least one of user's roles
      const { data: accessibleMenus, error: menuError } = await supabase
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

      if (menuError) throw menuError

      // Process menu items - build hierarchy
      const menuMap = new Map()
      const rootMenus = []

      // First pass: create all menu items
      accessibleMenus?.forEach((rmi) => {
        const menu = rmi.menu_items
        if (!menu || !menu.is_visible || !menu.is_active) return

        menuMap.set(menu.id, {
          ...menu,
          canUse: rmi.can_use,
          children: []
        })
      })

      // Second pass: build hierarchy
      menuMap.forEach((menu) => {
        if (menu.parent_menu_id) {
          const parent = menuMap.get(menu.parent_menu_id)
          if (parent) {
            parent.children.push(menu)
          } else {
            // Parent not in accessible menus, treat as root
            rootMenus.push(menu)
          }
        } else {
          rootMenus.push(menu)
        }
      })

      // Sort menus by sort_order
      const sortMenus = (menus) => {
        return menus
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(menu => ({
            ...menu,
            children: sortMenus(menu.children || [])
          }))
      }

      const sortedMenus = sortMenus(rootMenus)
      setMenuItems(sortedMenus)
    } catch (err) {
      console.error('Error fetching menu items:', err)
      setError(err.message)
      setMenuItems([])
    } finally {
      setLoading(false)
    }
  }

  return { menuItems, loading, error, refetch: fetchMenuItems }
}

