/**
 * v1240 — Simulator sidebar transform, shared by both apps' useMenu.js (previously a copy inside
 * each app's useMenu.js; the Simulator copy, which also handles the portfolio, programme and
 * coordinator practice scopes, is the one kept). Pure: depends only on @nidus/config helpers.
 */
import { applySimulatorRegistryFallback } from '@nidus/config/menuRegistryUtils'
import {
  METHODOLOGY_TRACK_IDS,
  filterMenuTreeByVisibleTracks,
  wrapPmoMenuWithMethodologyTracks,
} from '@nidus/config/methodologyMenuUtils'
import {
  applyCategorySortOrders,
  getTrackAnchorForLayout,
  applyPmoSectionNesting,
  applyTrackCategoryPresentationLabels,
  nestV671TrackCategories,
  relocateMisbucketedToTrackCategories,
  reorganizeMenuRoots,
} from '@nidus/config/pmoMenuHierarchyUtils'

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
    if (scope === 'portfolio') {
      if (code.startsWith('sim_pf') || code.startsWith('sim_portfolio')) return true
      if (path && path.startsWith('/simulator/portfolio')) return true
      return false
    }
    if (scope === 'programme') {
      if (code.startsWith('sim_pgm') || code.startsWith('sim_programme')) return true
      if (path && path.startsWith('/simulator/programme')) return true
      return false
    }
    if (scope === 'coordinator') {
      if (code.startsWith('sim_coord')) return true
      if (path && path.startsWith('/simulator/coordinator')) return true
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

  const layoutKey = scope === 'pmo' ? 'sim_pmo'
    : scope === 'portfolio' ? 'sim_portfolio'
    : scope === 'programme' ? 'sim_programme'
    : scope === 'coordinator' ? 'sim_coordinator'
    : 'sim_pm'
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
  let result = layoutKey === 'sim_pm'
    ? [...universalNodes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : wrapPmoMenuWithMethodologyTracks(
        universalNodes,
        trackSet,
        trackCategoryNodes,
        getTrackAnchorForLayout(layoutKey)
      )
  if (layoutKey !== 'sim_pm' && trackSet.size > 0 && trackSet.size < 3) {
    result = filterMenuTreeByVisibleTracks(result, trackSet)
  }
  return applySimulatorRegistryFallback(result, scope)
}
