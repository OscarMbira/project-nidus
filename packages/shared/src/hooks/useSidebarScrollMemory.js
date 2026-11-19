/**
 * Keeps the sidebar where the user left it across page navigations.
 *
 * Each page mounts its own layout, so the Sidebar is created fresh on every click and its menu
 * would jump back to the top. This hook remembers the menu's scroll position (in memory and
 * sessionStorage, per sidebar scope) and puts it back once the menu has rendered. If the active
 * item is still out of view after that, it is scrolled into view.
 *
 * @param {string} scopeKey   one memory per sidebar (e.g. 'platform:pm', 'simulator:pmo')
 * @param {boolean} ready     true once the menu items are rendered
 * @param {any} [layoutSignal] changes when the menu's height can change (e.g. the open group);
 *                             restoring retries until the saved position fits
 * @returns {import('react').RefObject<HTMLElement>} attach to the scrolling element
 */
import { useEffect, useLayoutEffect, useRef } from 'react'

const STORAGE_PREFIX = 'nidus:sidebarScroll:'
const memory = new Map()

function readSaved(scopeKey) {
  if (memory.has(scopeKey)) return memory.get(scopeKey)
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_PREFIX + scopeKey) : null
    const n = raw == null ? null : Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function save(scopeKey, value) {
  memory.set(scopeKey, value)
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_PREFIX + scopeKey, String(value))
  } catch {
    // storage unavailable — the in-memory copy still covers in-app navigation
  }
}

export function useSidebarScrollMemory(scopeKey, ready, layoutSignal = null) {
  const ref = useRef(null)
  const restoredRef = useRef(false)

  // Remember the position as the user scrolls.
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const onScroll = () => {
      if (restoredRef.current) save(scopeKey, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scopeKey, ready])

  // Put it back before paint once the menu is there; retry while the menu is still growing.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !ready || restoredRef.current) return
    const saved = readSaved(scopeKey)
    if (saved != null && saved > 0) {
      const max = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.min(saved, Math.max(max, 0))
      if (max < saved) return // the open group has not rendered yet — retry on the next signal
    }
    restoredRef.current = true
    const active = el.querySelector('[aria-current="page"]')
    if (active && typeof active.getBoundingClientRect === 'function') {
      const r = active.getBoundingClientRect()
      const c = el.getBoundingClientRect()
      if (r.top < c.top || r.bottom > c.bottom) active.scrollIntoView?.({ block: 'center' })
    }
  }, [scopeKey, ready, layoutSignal])

  // Stop retrying once the user scrolls or after the first second.
  useEffect(() => {
    if (!ready) return undefined
    const t = setTimeout(() => { restoredRef.current = true }, 1000)
    return () => clearTimeout(t)
  }, [ready])

  return ref
}

/** Remembered open top-level group, so the sidebar renders already expanded after navigation. */
const EXPANDED_KEY = 'nidus:sidebarExpanded:'
export function readSidebarExpanded(scopeKey) {
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(EXPANDED_KEY + scopeKey)) || null
  } catch {
    return null
  }
}
export function saveSidebarExpanded(scopeKey, id) {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (id) sessionStorage.setItem(EXPANDED_KEY + scopeKey, String(id))
    else sessionStorage.removeItem(EXPANDED_KEY + scopeKey)
  } catch {
    // ignore
  }
}
