/**
 * v1241 Amendment A — header/footer data for a product app's public pages (Platform, Simulator,
 * Planner). Returns null until loaded or if loading fails: the shared header then shows only the
 * logo and theme toggle, never invented links (rule 26).
 */
import { useEffect, useState } from 'react'
import { buildSiteChrome, getSiteChromeRowsCached } from '../site/siteChrome.js'

export function useSiteChrome() {
  const [chrome, setChrome] = useState(null)
  useEffect(() => {
    let cancelled = false
    getSiteChromeRowsCached({ baseUrl: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY })
      .then((rows) => { if (!cancelled) setChrome(buildSiteChrome(rows)) })
      .catch((err) => { console.error('[site header] could not load menus:', err?.message || err) })
    return () => { cancelled = true }
  }, [])
  return chrome
}

export default useSiteChrome
