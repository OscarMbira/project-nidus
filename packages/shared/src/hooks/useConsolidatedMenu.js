/**
 * v1341 — the extras of the consolidated sidebar that live outside the tree: slot tab strips
 * (D23) and the "Go to page" index (D22). Both menu builders (useMenu in Platform / Simulator,
 * useSimMenu for the practice menus) publish here after every build, so the tab strip above
 * the page and the sidebar search read one source without depending on which builder ran.
 * `null` means the organisation's switch is off: nothing renders.
 */
import { useSyncExternalStore } from 'react'

let current = null
const listeners = new Set()

/** @param {null | { slotTabs: object[], pageIndex: object[], packNames: Array<[string, string]>, placementKey?: string }} extras */
export function publishConsolidatedMenu(extras) {
  const next = extras && Array.isArray(extras.pageIndex) ? extras : null
  if (next === current) return
  current = next
  for (const fn of [...listeners]) {
    try { fn() } catch { /* ignore listener errors */ }
  }
}

export function getConsolidatedMenu() {
  return current
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useConsolidatedMenu() {
  return useSyncExternalStore(subscribe, getConsolidatedMenu, () => null)
}
