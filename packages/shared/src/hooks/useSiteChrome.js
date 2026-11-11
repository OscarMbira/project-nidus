/**
 * v1241 Amendment A — header/footer data for a product app's public pages (Platform, Simulator,
 * Planner). Returns null until loaded or if loading fails: the shared header then shows only the
 * logo and theme toggle, never invented links (rule 26).
 *
 * Stale-while-revalidate: the menus last loaded in this browser are drawn on the first paint (no
 * wait for the database); when they are older than 10 minutes they are refreshed in the
 * background and the header updates if anything changed in Admin.
 */
import { useEffect, useState } from 'react'
import { buildSiteChrome, readSiteChromeCache, refreshSiteChromeRows } from '../site/siteChrome.js'

function cachedChrome() {
  const cached = readSiteChromeCache()
  if (!cached) return null
  try {
    return buildSiteChrome(cached.rows)
  } catch {
    return null
  }
}

export function useSiteChrome() {
  const [chrome, setChrome] = useState(cachedChrome)
  useEffect(() => {
    if (readSiteChromeCache()?.fresh) return undefined
    let cancelled = false
    refreshSiteChromeRows({ baseUrl: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY })
      .then((rows) => { if (!cancelled) setChrome(buildSiteChrome(rows)) })
      // A failed refresh keeps the menus already shown (if any).
      .catch((err) => { console.error('[site header] could not load menus:', err?.message || err) })
    return () => { cancelled = true }
  }, [])
  return chrome
}

export default useSiteChrome
