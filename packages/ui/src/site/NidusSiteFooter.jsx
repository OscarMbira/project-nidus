/**
 * v1241 Amendment A — the one public footer for the Nidus brand site and the Platform, Simulator
 * and Planner public pages (A-D3). Columns: brand + products, Solutions, Resources, Company,
 * Legal; copyright line. All links from the database (rule 25.1); links into another
 * application open in a new window (A-D4). SSR-safe.
 */
import { brandHref, resolveNavHref, resolveProductHref } from '@nidus/shared/site/siteChrome.js'
import { ExtLink, NidusWordmark } from './siteLinks.jsx'

const linkCls = 'text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
const headCls = 'text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-200'

function Column({ title, links, ctx }) {
  if (!links?.length) return null
  return (
    <div>
      <h2 className={headCls}>{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.link_key}><ExtLink to={resolveNavHref(l, ctx)} className={linkCls}>{l.label}</ExtLink></li>
        ))}
      </ul>
    </div>
  )
}

export default function NidusSiteFooter({ chrome, currentProduct = null, onBrandSite = false, year = new Date().getFullYear() }) {
  if (!chrome) return null
  const ctx = { brandUrl: chrome.brandUrl, onBrandSite }
  const home = onBrandSite ? { href: '/', external: false } : chrome.brandUrl ? { href: brandHref(chrome.brandUrl), external: true } : null
  const { footer } = chrome
  return (
    // Always dark, like the header (owner decision 2026-10-12): the `dark` class switches every
    // dark: style inside it, whatever the page theme.
    <footer className="dark border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <ExtLink to={home} aria-label="Project Nidus home" title="Home" className="transition-opacity hover:opacity-80">
            <NidusWordmark />
          </ExtLink>
          {chrome.tagline && <p className="mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400">{chrome.tagline}</p>}
          {chrome.products.length > 0 && (
            <>
              <h2 className={`${headCls} mt-6`}>Products</h2>
              <ul className="mt-4 space-y-3">
                {chrome.products.map((p) => (
                  <li key={p.slug}><ExtLink to={resolveProductHref(p, 'landing_url', currentProduct)} className={linkCls}>{p.name}</ExtLink></li>
                ))}
              </ul>
            </>
          )}
        </div>
        <Column title="Solutions" links={footer.solutions} ctx={ctx} />
        <Column title="Resources" links={footer.resources} ctx={ctx} />
        <Column title="Company" links={footer.company} ctx={ctx} />
        <Column title="Legal" links={footer.legal} ctx={ctx} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-gray-500 dark:text-gray-400">© {year} Project Nidus. All rights reserved.</p>
      </div>
    </footer>
  )
}
