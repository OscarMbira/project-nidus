import { useCallback, useEffect, useState } from 'react'

/** Desktop sidebar hidden/shown. Shared by the header button, the sidebar, and page shells. */
export const SIDEBAR_COLLAPSED_KEY = 'nidus:sidebar-collapsed'
export const SIDEBAR_COLLAPSED_EVENT = 'nidus:sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Whether the desktop sidebar is hidden. The choice is stored on this browser
 * and applied on every page that uses the shared sidebar shell.
 * Mobile drawers stay separate: they still open and close with the overlay.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  useEffect(() => {
    const sync = () => setCollapsed(readCollapsed())
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    const next = !readCollapsed()
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
    setCollapsed(next)
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT))
  }, [])

  return { collapsed, toggleCollapsed }
}

/** Left margin the main column uses to sit beside the desktop sidebar. */
export function mainContentSidebarOffsetClass(collapsed) {
  return collapsed ? 'lg:ml-0' : 'lg:ml-80'
}

/**
 * Max-width for a page's inner content container. Pages that wrap their content in a
 * fixed `max-w-7xl mx-auto` stay that width even when the sidebar is hidden, leaving
 * large empty margins. Widen to the full available width once the sidebar is hidden.
 */
export function pageContainerMaxWidthClass(collapsed) {
  return collapsed ? 'max-w-full' : 'max-w-7xl'
}

/**
 * Slide classes for the sidebar panel.
 * Below the lg breakpoint the mobile drawer follows `isOpen`.
 * At lg and above the panel follows the persisted hide/show choice.
 */
export function sidebarPanelTransformClass(collapsed, isOpen) {
  const mobile = isOpen ? 'translate-x-0' : '-translate-x-full'
  const desktop = collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
  return `${mobile} ${desktop}`
}
