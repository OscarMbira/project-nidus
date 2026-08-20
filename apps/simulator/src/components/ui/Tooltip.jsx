import { useId, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Lightweight theme-aware tooltip. Shows on hover and keyboard focus; touch
 * taps fire the wrapped control's own onClick without needing a tooltip step.
 * Uses a fixed portal so tooltips are not clipped by overflow-x table wrappers.
 * @param {{ label?: string, children: React.ReactNode, className?: string }} props
 */
export default function Tooltip({ label, children, className = '' }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const wrapRef = useRef(null)
  const id = useId()

  const updateCoords = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ top: r.top, left: r.left + r.width / 2 })
  }, [])

  const show = () => {
    updateCoords()
    setVisible(true)
  }

  const hide = () => setVisible(false)

  if (!label) return children

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex ${className}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{
              top: Math.max(4, coords.top - 6),
              left: coords.left,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none fixed z-[200] whitespace-nowrap rounded px-2 py-1 text-xs font-medium shadow-lg bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  )
}
