/**
 * Simulator sidebar menu hook — DB-driven menu filtered to /simulator/* scope.
 * Uses the same platform sidebar cache (rawHierarchy) to avoid a redundant DB
 * fetch when the platform menu was already loaded in this session.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { platformDb } from '../services/supabaseClient'
import { fetchMenuFromDBShared, applySimulatorMenuTransform } from './useMenu'
import { filterSimulatorLearnerMenu } from '../config/methodologyMenuUtils'
import {
  isSidebarCacheFresh,
  purgeAllSidebarMenuCaches,
  readSidebarCache,
} from '../utils/menuCacheUtils'

/**
 * @param {'pmo'|'pm'} scope
 * @param {boolean} [enabled=true]
 */
export function useSimMenu(scope = 'pmo', enabled = true) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const currentUserRef = useRef(null)

  /** Transform rawHierarchy → simulator-scoped items and set state. */
  const applyTransform = useCallback((rawHierarchy, layoutHint) => {
    const visibleTracks = layoutHint?.visibleTracks?.length
      ? new Set(layoutHint.visibleTracks)
      : undefined
    let transformed = applySimulatorMenuTransform(rawHierarchy || [], scope, { visibleTracks })
    if (layoutHint?.isSimulatorLearner) {
      transformed = filterSimulatorLearnerMenu(transformed, true)
    }
    return transformed
  }, [scope])

  const loadMenu = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!enabled) return
    try {
      setError(null)

      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) {
        setMenuItems([])
        setLoading(false)
        return
      }
      currentUserRef.current = user

      // ── Cache check ──────────────────────────────────────────────────────
      // Reuse the platform sidebar cache — it stores the full rawHierarchy
      // which includes all simulator menu items.
      if (!forceRefresh) {
        const cached = readSidebarCache(user.id, scope)
        if (cached?.rawHierarchy) {
          const transformed = applyTransform(cached.rawHierarchy, cached.layoutHint)
          setMenuItems(transformed)
          setLoading(false)

          if (isSidebarCacheFresh(cached)) {
            return  // Fresh — skip DB fetch
          }
          // Stale — fall through to refresh in background (no skeleton)
        } else {
          setLoading(true)
        }
      } else {
        setLoading(true)
      }

      // ── DB fetch ─────────────────────────────────────────────────────────
      // NOTE: useSimMenu never writes the platform cache. Only useMenuProvider
      // (MenuProvider) may write nidus_sidebar_v2_* so the platform items field
      // is never polluted with simulator-scoped data.
      const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
      const { items: rawItems, rawHierarchy, error: fetchError, layoutHint } =
        await fetchMenuFromDBShared(user, { raw: true, pathname, layoutPreference: scope })

      if (fetchError) {
        setError(fetchError)
        setMenuItems([])
        setLoading(false)
        return
      }

      const transformed = applyTransform(rawHierarchy || rawItems || [], layoutHint)
      setMenuItems(transformed)

      setLoading(false)
    } catch (err) {
      console.error('useSimMenu:', err)
      setError('Failed to load simulator menu.')
      setMenuItems([])
      setLoading(false)
    }
  }, [scope, enabled, applyTransform])

  useEffect(() => {
    if (!enabled) {
      setMenuItems([])
      setLoading(false)
      setError(null)
      return
    }
    purgeAllSidebarMenuCaches()  // remove legacy v1 keys once
    loadMenu()
  }, [loadMenu, enabled])

  const refetch = useCallback(() => loadMenu({ forceRefresh: true }), [loadMenu])

  return { menuItems, loading, error, refetch }
}

export default useSimMenu
