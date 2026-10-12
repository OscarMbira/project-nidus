/**
 * v1241 Amendment A — the shared header/footer for a product app's public pages (Platform,
 * Simulator, Planner). Loads the menus once per browser session (useSiteChrome) and renders the
 * same NidusSiteHeader / NidusSiteFooter the brand site uses (A-D3, A-D5).
 *
 * Apps pass only what differs: which product they are, their theme toggle, and their router Link
 * so the product bar stays inside the single-page app.
 */
import { useSiteChrome } from '@nidus/shared/hooks/useSiteChrome.js'
import NidusSiteHeader from './NidusSiteHeader.jsx'
import NidusSiteFooter from './NidusSiteFooter.jsx'

export function PublicSiteHeader({ currentProduct, themeToggle = null, LinkComponent = null }) {
  const chrome = useSiteChrome()
  return <NidusSiteHeader chrome={chrome} currentProduct={currentProduct} themeToggle={themeToggle} LinkComponent={LinkComponent} />
}

export function PublicSiteFooter({ currentProduct }) {
  const chrome = useSiteChrome()
  return <NidusSiteFooter chrome={chrome} currentProduct={currentProduct} />
}
