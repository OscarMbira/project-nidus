/**
 * Simulator sidebar menu hook — DB-driven menu filtered to /simulator/* scope.
 * Uses the same platform sidebar cache (rawHierarchy) to avoid a redundant DB
 * fetch when the platform menu was already loaded in this session.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { platformDb } from '../services/supabaseClient'
import { fetchMenuFromDBShared, applySimulatorMenuTransform } from './useMenu'
import { filterSimulatorLearnerMenu } from '@nidus/config/methodologyMenuUtils'
import { groupMenuTreeByIndustryPack } from '@nidus/config/pmoMenuHierarchyUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getMenuItemIndustryPackMap } from '../services/organisationIndustryService.js'
import { listPracticeProjectIndustries } from '../services/sim/simProjectIndustryService.js'
import {
  isSidebarCacheFresh,
  purgeAllSidebarMenuCaches,
  readSidebarCache,
} from '@nidus/shared/utils/menuCacheUtils'
import simulatorPortfolioMenuConfig from '../config/simulatorPortfolioMenuConfig'
import simulatorProgrammeMenuConfig from '../config/simulatorProgrammeMenuConfig'
import simulatorCoordinatorMenuConfig from '../config/simulatorCoordinatorMenuConfig'

const STATIC_SCOPE_MENUS = {
  portfolio: simulatorPortfolioMenuConfig,
  programme: simulatorProgrammeMenuConfig,
  coordinator: simulatorCoordinatorMenuConfig,
}

// v930 — pack-grouped sidebar menu: last-resolved industry-pack context per auth user, self-
// contained to this hook (not shared with useMenu.js's own copy — this file is deliberately
// independent, see its header comment). Lets the synchronous cache-check fast path below apply
// pack-grouping best-effort without awaiting a DB round trip.
const _simPackContextByAuthUserId = new Map()

function staticConfigToMenuItems(config = []) {
  return config.map((item, index) => ({
    menu_code: item.id,
    menu_label: item.label,
    route_path: item.path,
    sort_order: index,
    children: [],
  }))
}

/**
 * @param {'pmo'|'pm'|'portfolio'|'programme'|'coordinator'} scope
 * @param {boolean} [enabled=true]
 */
export function useSimMenu(scope = 'pmo', enabled = true) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const currentUserRef = useRef(null)
  // v1106 — project-scoped 'pm' layout restricts the sidebar's industry pack section(s) to the
  // CURRENTLY OPEN practice project's own industries, mirroring Platform's useMenu.js. Practice
  // project pages carry the id as a `:projectId` route path segment (the dominant convention
  // across ~30 pm-scoped sim routes — a raw practice_projects.id, no project-code layer like
  // Platform), with a `?projectId=`/`?practiceProjectId=` query-string fallback for the couple of
  // pages that use that pattern instead. 'pmo'/'portfolio'/'programme'/'coordinator' scopes are
  // org-wide and unaffected — they keep seeing every enabled industry.
  const params = useParams()
  const [searchParams] = useSearchParams()
  const currentPracticeProjectId =
    params.projectId || searchParams.get('projectId') || searchParams.get('practiceProjectId') || null
  const currentPracticeProjectIdRef = useRef(currentPracticeProjectId)
  currentPracticeProjectIdRef.current = currentPracticeProjectId

  /** Transform rawHierarchy → simulator-scoped items and set state. */
  const applyTransform = useCallback((rawHierarchy, layoutHint) => {
    const visibleTracks = layoutHint?.visibleTracks?.length
      ? new Set(layoutHint.visibleTracks)
      : undefined
    let transformed = applySimulatorMenuTransform(rawHierarchy || [], scope, { visibleTracks })
    if (!transformed?.length && STATIC_SCOPE_MENUS[scope]) {
      transformed = staticConfigToMenuItems(STATIC_SCOPE_MENUS[scope])
    }
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
          let transformed = applyTransform(cached.rawHierarchy, cached.layoutHint)
          // v930 — best-effort synchronous pack-grouping from the last-resolved context for
          // this user; this fast path is deliberately synchronous, no DB round trip.
          const cachedPackContext = _simPackContextByAuthUserId.get(user.id)
          if (transformed?.length && cachedPackContext) {
            transformed = groupMenuTreeByIndustryPack(transformed, { ...cachedPackContext, layout: scope })
          }
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

      let transformed = applyTransform(rawHierarchy || rawItems || [], layoutHint)

      // v930 — pack-grouped sidebar menu: wrap the finished tree into "Core Project
      // Management" + one section per enabled industry pack. getCurrentUserAccountId() is
      // sessionStorage-cached (rule 66), so this is cheap after the first resolution.
      if (transformed?.length) {
        try {
          const isProjectScopedLayout = scope === 'pm'
          const accountId = await getCurrentUserAccountId()
          if (accountId) {
            const projIndustryRes = isProjectScopedLayout
              ? await listPracticeProjectIndustries(currentPracticeProjectIdRef.current)
              : { success: true, data: null }
            const projectIndustryIds = projIndustryRes?.success
              ? (projIndustryRes.data || []).map((r) => r.industry_category_id).filter(Boolean)
              : []
            const restrictToIndustryCategoryIds = !isProjectScopedLayout
              ? null
              : (projectIndustryIds.length > 0 ? projectIndustryIds : null)
            const packResult = await getMenuItemIndustryPackMap(accountId, restrictToIndustryCategoryIds)
            if (packResult.success) {
              transformed = groupMenuTreeByIndustryPack(transformed, { ...packResult.data, layout: scope })
              _simPackContextByAuthUserId.set(user.id, packResult.data)
            }
          }
        } catch (packErr) {
          console.warn('useSimMenu: pack-grouped sidebar context failed, showing ungrouped tree:', packErr?.message || packErr)
        }
      }

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
