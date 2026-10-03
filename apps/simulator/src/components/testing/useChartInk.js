import { useEffect, useState } from 'react'

const LIGHT = {
  tick: '#374151',
  grid: '#d1d5db',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipText: '#111827',
}

const DARK = {
  tick: '#e5e7eb',
  grid: '#4b5563',
  tooltipBg: '#111827',
  tooltipBorder: '#374151',
  tooltipText: '#f3f4f6',
}

/** Recharts paints ticks with a fixed fill, so follow the document dark class. */
export function useChartInk() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'))
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return dark ? DARK : LIGHT
}
