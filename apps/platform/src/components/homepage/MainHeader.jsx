/**
 * MainHeader — v1241 Amendment A: now the shared Nidus public header (packages/ui NidusSiteHeader)
 * with the product bar of the app it runs in.
 * Kept under its old name so the public pages that use it did not change. Menus come from the
 * database (site_products, site_nav_links); edit them in Admin, not here.
 */
import { Link } from 'react-router-dom'
import { PublicSiteHeader } from '@nidus/ui/site/PublicSiteChrome.jsx'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import ThemeToggle from '../ThemeToggle'

// eslint-disable-next-line no-unused-vars
const MainHeader = (_props) => {
  const { app } = useAppConfig()
  return <PublicSiteHeader currentProduct={app} themeToggle={<ThemeToggle />} LinkComponent={Link} />
}

export default MainHeader
