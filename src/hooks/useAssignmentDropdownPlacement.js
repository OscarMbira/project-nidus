import { useLayoutEffect, useRef, useState } from 'react'

/** ~ Tailwind max-h-52 (13rem) */
const DEFAULT_MAX_PX = 208
const VIEW_MARGIN = 16
/** Prefer opening upward when remaining viewport below anchor is smaller than this (px). */
const FLIP_THRESHOLD = 96

/**
 * Positions an assignment dropdown above the anchor when near the bottom of the viewport.
 *
 * @param {boolean} open — panel is expanded
 * @param {boolean} listVisible — list box is rendered (not loading / not error)
 * @returns {{ rootRef: React.RefObject<HTMLDivElement>, openUpward: boolean, maxHeight: number }}
 */
export function useAssignmentDropdownPlacement(open, listVisible) {
  const rootRef = useRef(null)
  const [placement, setPlacement] = useState({ openUpward: false, maxHeight: DEFAULT_MAX_PX })

  useLayoutEffect(() => {
    if (!open || !listVisible) return

    const measure = () => {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - VIEW_MARGIN
      const spaceAbove = rect.top - VIEW_MARGIN
      const openUpward = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow
      const rawMax = openUpward ? spaceAbove : spaceBelow
      const maxHeight = Math.max(120, Math.min(DEFAULT_MAX_PX, rawMax))

      setPlacement(prev =>
        prev.openUpward === openUpward && prev.maxHeight === maxHeight ? prev : { openUpward, maxHeight }
      )
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, listVisible])

  return { rootRef, openUpward: placement.openUpward, maxHeight: placement.maxHeight }
}
