/**
 * PlatformFooter — v1241 Amendment A: now the shared Nidus public footer (packages/ui NidusSiteFooter).
 * Kept under its old name so the public pages that use it did not change. Links come from the
 * database (site_products, site_nav_links); edit them in Admin, not here.
 */
import { PublicSiteFooter } from '@nidus/ui/site/PublicSiteChrome.jsx'

const PlatformFooter = () => {
  return <PublicSiteFooter currentProduct="platform" />
}

export default PlatformFooter
