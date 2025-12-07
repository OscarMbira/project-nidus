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

      // USERS TABLE QUERY TEMPORARILY DISABLED
      // The users table has RLS issues causing 500 errors
      // Using fallback menu until SQL/v83_fix_users_table_access.sql is run
      console.log('Using fallback menu (users table RLS disabled)')
      setMenuItems(getFallbackMenuItems())
      setLoading(false)
      return

      // Get user record ID from users table
      // const { data: userRecord, error: userRecordError } = await supabase
      //   .from('users')
      //   .select('id')
      //   .eq('auth_user_id', user.id)
      //   .single()

      // if (userRecordError || !userRecord) {
      //   // User record might not exist yet, use fallback menu
      //   console.warn('User record not found, using fallback menu')
      //   setMenuItems(getFallbackMenuItems())
      //   setLoading(false)
      //   return
      // }

      // Get user's roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userRecord.id)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError)
        // Use fallback menu if roles can't be fetched
        setMenuItems(getFallbackMenuItems())
        setLoading(false)
        return
      }

      if (!userRoles || userRoles.length === 0) {
        // No roles assigned, use fallback menu
        console.warn('No roles assigned, using fallback menu')
        setMenuItems(getFallbackMenuItems())
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
      
      // If no menus found, use fallback
      if (sortedMenus.length === 0) {
        setMenuItems(getFallbackMenuItems())
      } else {
        setMenuItems(sortedMenus)
      }
    } catch (err) {
      console.error('Error fetching menu items:', err)
      setError(err.message)
      // Use fallback menu on error
      setMenuItems(getFallbackMenuItems())
    } finally {
      setLoading(false)
    }
  }

  // Fallback menu items for users without roles or when menu system fails
  function getFallbackMenuItems() {
    return [
      {
        id: 'fallback-dashboard',
        menu_code: 'dashboard',
        menu_label: 'Dashboard',
        menu_description: 'Main dashboard',
        route_path: '/dashboard',
        menu_icon: 'layout-dashboard',
        menu_color: '#3B82F6',
        menu_level: 1,
        sort_order: 1,
        children: []
      },
      {
        id: 'fallback-projects',
        menu_code: 'projects',
        menu_label: 'Projects',
        menu_description: 'Project management',
        route_path: '/projects',
        menu_icon: 'folder-kanban',
        menu_color: '#10B981',
        menu_level: 1,
        sort_order: 2,
        children: []
      },
      {
        id: 'fallback-tasks',
        menu_code: 'tasks',
        menu_label: 'Tasks',
        menu_description: 'Task management',
        route_path: '/tasks',
        menu_icon: 'list-checks',
        menu_color: '#F59E0B',
        menu_level: 1,
        sort_order: 3,
        children: []
      }
    ]
  }

  return { menuItems, loading, error, refetch: fetchMenuItems }
}

