/**
 * Simulator sidebar menu hook — DB-driven menu filtered to /simulator/* scope.
 * @see projectplan/v638_Unified_Sidebar_Menu_Implementation_Plan.md Phase 4
 */
import { useState, useEffect, useCallback } from 'react'
import { platformDb } from '../services/supabaseClient'
import { fetchMenuFromDB, applySimulatorMenuTransform } from './useMenu'

const SIM_MENU_CACHE_TTL = 5 * 60 * 1000
const SIM_MENU_CACHE_PREFIX = 'nidus_sim_menu_v23_'

function simCacheKey(userId, scope) {
  return `${SIM_MENU_CACHE_PREFIX}${scope}_${userId}`
}

function readSimCache(userId, scope) {
  try {
    const raw = localStorage.getItem(simCacheKey(userId, scope))
    if (!raw) return null
    const { items, at } = JSON.parse(raw)
    if (Date.now() - at < SIM_MENU_CACHE_TTL && Array.isArray(items)) return items
    return null
  } catch {
    return null
  }
}

function writeSimCache(userId, scope, items) {
  try {
    localStorage.setItem(
      simCacheKey(userId, scope),
      JSON.stringify({ items, at: Date.now() })
    )
  } catch { /* storage unavailable */ }
}

/**
 * @param {'pmo'|'pm'} scope
 * @param {boolean} [enabled=true]
 */
export function useSimMenu(scope = 'pmo', enabled = true) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const loadMenu = useCallback(async () => {
    if (!enabled) return
    try {
      setError(null)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) {
        setMenuItems([])
        setLoading(false)
        return
      }

      const cached = readSimCache(user.id, scope)
      if (cached?.length) {
        setMenuItems(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }

      const { items: rawItems, error: fetchError } = await fetchMenuFromDB(user, { raw: true })
      if (fetchError) {
        if (!cached?.length) setError(fetchError)
        setLoading(false)
        return
      }

      const transformed = applySimulatorMenuTransform(rawItems || [], scope)
      setMenuItems(transformed)
      writeSimCache(user.id, scope, transformed)
      setLoading(false)
    } catch (err) {
      console.error('useSimMenu:', err)
      setError('Failed to load simulator menu.')
      setLoading(false)
    }
  }, [scope, enabled])

  useEffect(() => {
    if (!enabled) {
      setMenuItems([])
      setLoading(false)
      setError(null)
      return
    }
    loadMenu()
  }, [loadMenu, enabled])

  return { menuItems, loading, error, refetch: loadMenu }
}

export default useSimMenu
