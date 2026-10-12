/**
 * PlatformHeader — v1241 Amendment A: now the shared Nidus public header (packages/ui NidusSiteHeader)
 * with the Platform product bar.
 * Kept under its old name so the public pages that use it did not change. Menus come from the
 * database (site_products, site_nav_links); edit them in Admin, not here.
 */
import { Link } from 'react-router-dom'
import { PublicSiteHeader } from '@nidus/ui/site/PublicSiteChrome.jsx'
import ThemeToggle from '../ThemeToggle'

// eslint-disable-next-line no-unused-vars
const PlatformHeader = (_props) => {
  return <PublicSiteHeader currentProduct="platform" themeToggle={<ThemeToggle />} LinkComponent={Link} />
}

export default PlatformHeader
