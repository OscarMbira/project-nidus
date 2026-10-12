/**
 * v1241 Amendment A — data for the shared Nidus header and footer (brand site + every product's
 * public pages). Everything comes from the database (rule 25.1):
 *   site_products   → Products ▾, Sign in ▾, Get started, footer product list
 *   site_nav_links  → Solutions ▾, Resources ▾, Company ▾ and the footer columns
 *   site_pages      → which internal pages exist (inactive pages are never linked)
 *   site_content    → brand.url, footer.tagline
 *   site_header_settings → each header's colours and primary button (v1264)
 * Read with the public anon key through the REST endpoint, so it works before sign-in, in the
 * build-time prerender (Node) and in every app, without a Supabase client.
 */

const NEVER_LISTED = new Set(['admin']) // Admin is internal: never shown publicly
export const SITE_CHROME_CACHE_KEY = 'nidus:siteChrome:v2'
const CACHE_TTL_MS = 10 * 60 * 1000

/** Brand-site routes that are not site_pages rows. */
export const BUILT_IN_PATHS = new Set(['', 'pricing', 'contact'])

const byOrder = (a, b) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.label || a.name || '').localeCompare(String(b.label || b.name || ''), undefined, { sensitivity: 'base' })

/** Join a brand-site base URL and a path: brandHref('https://x.com/', 'about') → 'https://x.com/about'. */
export function brandHref(brandUrl, path = '') {
  const base = String(brandUrl || '').replace(/\/+$/, '')
  const p = String(path || '').replace(/^\/+/, '')
  return p ? `${base}/${p}` : `${base}/`
}

/**
 * Where a nav link goes and whether it leaves the current application (→ new window, A-D4).
 * onBrandSite: rendering on the brand site itself (internal links stay in the same window).
 */
export function resolveNavHref(link, { brandUrl, onBrandSite }) {
  if (link.url) return { href: link.url, external: true }
  const path = String(link.page_slug || '').replace(/^\/+/, '')
  if (onBrandSite) return { href: `/${path}`, external: false }
  return { href: brandHref(brandUrl, path), external: true }
}

/** Link to a product; it stays in the same window only inside that product. */
export function resolveProductHref(product, field, currentProduct) {
  const href = product?.[field]
  if (!href) return null
  return { href, external: product.slug !== currentProduct }
}

/**
 * Raw rows → the shape the header and footer render. Pure; exported for tests.
 * Internal links to inactive / missing pages are dropped, so a page switched off in Admin
 * disappears from every menu at once.
 */
export function buildSiteChrome({ products = [], content = [], navLinks = [], pages = [], headers = [] } = {}) {
  const text = {}
  for (const r of content) if (r && r.is_active !== false && r.content_key) text[r.content_key] = r.content_value ?? ''
  const activePages = new Set(pages.filter((p) => p && p.is_active !== false).map((p) => p.slug))
  const linkable = (l) => l.url || BUILT_IN_PATHS.has(l.page_slug) || activePages.has(l.page_slug)
  const groupOf = (g) => navLinks.filter((l) => l && l.is_active !== false && l.nav_group === g && linkable(l)).sort(byOrder)

  return {
    brandUrl: text['brand.url'] || null,
    tagline: text['footer.tagline'] || '',
    products: products
      .filter((p) => p && p.is_active !== false && !NEVER_LISTED.has(String(p.slug || '').toLowerCase()))
      .sort(byOrder),
    menus: {
      solutions: groupOf('solutions'),
      resources: groupOf('resources'),
      company: groupOf('company'),
    },
    // Each product's own bar (product_<slug>), shown only inside that product (in-app paths).
    productMenus: Object.fromEntries(
      [...new Set(navLinks.filter((l) => l && /^product_/.test(l.nav_group || '')).map((l) => l.nav_group))]
        .map((g) => [g.replace(/^product_/, ''), groupOf(g)])
    ),
    // v1264: colours + primary button per header ('brand' or a product slug).
    headers: Object.fromEntries(headers.filter((h) => h && h.is_active !== false && h.scope_slug).map((h) => [h.scope_slug, h])),
    footer: {
      solutions: groupOf('footer_solutions'),
      resources: groupOf('footer_resources'),
      company: groupOf('footer_company'),
      legal: groupOf('footer_legal'),
    },
  }
}

/**
 * v1264 — the primary button of a header. Brand site (no product): the "Which product?" chooser
 * unless an address is configured. Product: the configured address, else its sign-up page.
 * In-app paths ('/…') and the product's own site stay in the same window.
 */
export function resolveHeaderCta(chrome, currentProduct) {
  const settings = chrome?.headers?.[currentProduct || 'brand'] || null
  const label = settings?.cta_label || 'Get started'
  const product = currentProduct ? (chrome?.products || []).find((p) => p.slug === currentProduct) : null
  const href = settings?.cta_url || (currentProduct ? product?.sign_up_url : null)
  if (!href) return currentProduct ? null : { label, chooser: true }
  const inApp = href.startsWith('/')
  return { label, chooser: false, href, inApp, external: !inApp && !sameOrigin(href, product?.landing_url) }
}

function sameOrigin(a, b) {
  try {
    return Boolean(b) && new URL(a).origin === new URL(b).origin
  } catch {
    return false
  }
}

/** v1264 D8 — a product's own links for its header, minus any that duplicate the primary button. */
export function productHeaderLinks(chrome, currentProduct, cta) {
  const links = chrome?.productMenus?.[currentProduct] || []
  return cta?.href ? links.filter((l) => l.url !== cta.href) : links
}

export const HEADER_SETTINGS_COLUMNS = 'scope_slug,bg_color,text_color,accent_color,cta_text_color,cta_label,cta_url,is_active'

/**
 * v1264 header settings. Colours are presentation only, so if they cannot be read (e.g. SQL v1264
 * not applied yet) the header uses its built-in colours instead of losing every menu (PRD story 19).
 */
export async function fetchHeaderSettings(baseUrl, anonKey) {
  try {
    return await getRows(baseUrl, anonKey, 'site_header_settings', HEADER_SETTINGS_COLUMNS)
  } catch (err) {
    console.warn('[site header] header settings unavailable, using built-in colours:', err?.message || err)
    return []
  }
}

async function getRows(baseUrl, anonKey, table, select, extra = '') {
  const url = `${String(baseUrl).replace(/\/$/, '')}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}`
  const res = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } })
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`)
  return res.json()
}

/** Load the header/footer rows (no cache). Throws on failure — callers show no menus rather than invented ones (rule 26). */
export async function fetchSiteChromeRows({ baseUrl, anonKey }) {
  if (!baseUrl || !anonKey) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set')
  const [products, content, navLinks, pages, headers] = await Promise.all([
    getRows(baseUrl, anonKey, 'site_products',
      'slug,name,tagline,description,audience,landing_url,sign_in_url,sign_up_url,pricing_url,docs_url,icon_key,accent_key,sort_order,is_active'),
    getRows(baseUrl, anonKey, 'site_content', 'content_key,content_value,is_active'),
    getRows(baseUrl, anonKey, 'site_nav_links', 'link_key,nav_group,label,description,page_slug,url,sort_order,is_active'),
    getRows(baseUrl, anonKey, 'site_pages', 'slug,title,summary,page_kind,sort_order,is_active'),
    fetchHeaderSettings(baseUrl, anonKey),
  ])
  return { products, content, navLinks, pages, headers }
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(SITE_CHROME_CACHE_KEY)
    if (!raw) return null
    const { at, rows } = JSON.parse(raw)
    return Date.now() - at < CACHE_TTL_MS ? rows : null
  } catch {
    return null
  }
}

function writeCache(rows) {
  try {
    sessionStorage.setItem(SITE_CHROME_CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
  } catch {
    /* storage unavailable — reload next time */
  }
}

/** Rows for the product apps, cached for 10 minutes per browser session (rule 66). */
export async function getSiteChromeRowsCached({ baseUrl, anonKey }) {
  const cached = readCache()
  if (cached) return cached
  const rows = await fetchSiteChromeRows({ baseUrl, anonKey })
  writeCache(rows)
  return rows
}
