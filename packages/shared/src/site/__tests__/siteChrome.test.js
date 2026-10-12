import { describe, it, expect } from 'vitest'
import { buildSiteChrome, resolveNavHref, resolveProductHref, brandHref, resolveHeaderCta, productHeaderLinks } from '../siteChrome.js'

const rows = {
  products: [
    { slug: 'simulator', name: 'Simulator', sort_order: 20, is_active: true },
    { slug: 'admin', name: 'Admin', sort_order: 1, is_active: true },
    { slug: 'platform', name: 'Platform', sort_order: 10, is_active: true, landing_url: 'https://p/' },
    { slug: 'planner', name: 'Planner', sort_order: 30, is_active: false },
  ],
  content: [{ content_key: 'brand.url', content_value: 'https://nidus.test/', is_active: true }, { content_key: 'footer.tagline', content_value: 'Plan.', is_active: true }],
  navLinks: [
    { link_key: 'b', nav_group: 'company', label: 'Contact', page_slug: 'contact', sort_order: 20 },
    { link_key: 'a', nav_group: 'company', label: 'About', page_slug: 'about', sort_order: 10 },
    { link_key: 'c', nav_group: 'company', label: 'Careers', page_slug: 'careers', sort_order: 30 },
    { link_key: 'd', nav_group: 'resources', label: 'Docs', url: 'https://p/docs', sort_order: 10 },
    { link_key: 'e', nav_group: 'footer_legal', label: 'Terms', page_slug: 'terms', sort_order: 10 },
    { link_key: 'f', nav_group: 'footer_company', label: 'Pricing', page_slug: 'pricing', sort_order: 10 },
    { link_key: 'g', nav_group: 'company', label: 'Hidden', page_slug: 'about', sort_order: 5, is_active: false },
  ],
  pages: [{ slug: 'about', is_active: true }, { slug: 'terms', is_active: false }],
}

describe('buildSiteChrome', () => {
  const chrome = buildSiteChrome(rows)

  it('lists active products in order and never Admin', () => {
    expect(chrome.products.map((p) => p.slug)).toEqual(['platform', 'simulator'])
  })

  it('keeps links to active pages, built-in routes and other apps; drops missing or inactive pages', () => {
    expect(chrome.menus.company.map((l) => l.label)).toEqual(['About', 'Contact']) // careers page missing, hidden link inactive
    expect(chrome.menus.resources.map((l) => l.label)).toEqual(['Docs'])
    expect(chrome.footer.legal).toEqual([]) // terms page inactive
    expect(chrome.footer.company.map((l) => l.label)).toEqual(['Pricing']) // built-in route
  })

  it('reads the brand address and tagline from site_content', () => {
    expect(chrome.brandUrl).toBe('https://nidus.test/')
    expect(chrome.tagline).toBe('Plan.')
  })
})

describe('links', () => {
  it('stays in the same window for brand pages on the brand site', () => {
    expect(resolveNavHref({ page_slug: 'about' }, { brandUrl: 'https://n/', onBrandSite: true })).toEqual({ href: '/about', external: false })
  })
  it('opens brand pages in a new window from a product app', () => {
    expect(resolveNavHref({ page_slug: 'solutions/pmo' }, { brandUrl: 'https://n/', onBrandSite: false })).toEqual({ href: 'https://n/solutions/pmo', external: true })
  })
  it('always opens another app in a new window', () => {
    expect(resolveNavHref({ url: 'https://p/docs' }, { brandUrl: 'https://n/', onBrandSite: true })).toEqual({ href: 'https://p/docs', external: true })
  })
  it('keeps a product in the same window only inside that product', () => {
    const p = { slug: 'platform', landing_url: 'https://p/' }
    expect(resolveProductHref(p, 'landing_url', 'platform').external).toBe(false)
    expect(resolveProductHref(p, 'landing_url', 'planner').external).toBe(true)
    expect(resolveProductHref(p, 'sign_up_url', null)).toBeNull()
  })
  it('joins brand paths cleanly', () => {
    expect(brandHref('https://n//', '/about')).toBe('https://n/about')
    expect(brandHref('https://n')).toBe('https://n/')
  })
})

describe('v1264 header settings', () => {
  const products = [
    { slug: 'platform', name: 'Platform', landing_url: 'https://p/', sign_up_url: 'https://p/register', is_active: true },
    { slug: 'planner', name: 'Planner', landing_url: 'https://pl/', sign_up_url: 'https://pl/signup', is_active: true },
  ]
  const navLinks = [
    { link_key: 'pf', nav_group: 'product_platform', label: 'Features', url: '/platform/features', sort_order: 10 },
    { link_key: 'pd', nav_group: 'product_platform', label: 'Request a demo', url: '/platform/request-demo', sort_order: 40 },
  ]
  const headers = [
    { scope_slug: 'platform', cta_label: 'Request a demo', cta_url: '/platform/request-demo', is_active: true },
    { scope_slug: 'planner', cta_label: 'Start free trial', cta_url: null, is_active: true },
    { scope_slug: 'brand', cta_label: 'Get started', cta_url: null, is_active: true },
    { scope_slug: 'simulator', cta_label: 'Old', is_active: false },
  ]
  const chrome = buildSiteChrome({ products, navLinks, headers })

  it('keys active header settings by scope', () => {
    expect(Object.keys(chrome.headers).sort()).toEqual(['brand', 'planner', 'platform'])
  })
  it('product CTA: configured in-app path, else the product sign-up (same window)', () => {
    expect(resolveHeaderCta(chrome, 'platform')).toMatchObject({ label: 'Request a demo', href: '/platform/request-demo', inApp: true, external: false })
    expect(resolveHeaderCta(chrome, 'planner')).toMatchObject({ href: 'https://pl/signup', inApp: false, external: false })
  })
  it('a CTA address on another site opens in a new window', () => {
    const c = buildSiteChrome({ products, headers: [{ scope_slug: 'planner', cta_label: 'Book', cta_url: 'https://cal.example/x', is_active: true }] })
    expect(resolveHeaderCta(c, 'planner').external).toBe(true)
  })
  it('brand CTA opens the chooser unless an address is set; built-in label without settings', () => {
    expect(resolveHeaderCta(chrome, null)).toEqual({ label: 'Get started', chooser: true })
    expect(resolveHeaderCta(buildSiteChrome({ products }), null)).toEqual({ label: 'Get started', chooser: true })
  })
  it('drops product links that duplicate the CTA', () => {
    const cta = resolveHeaderCta(chrome, 'platform')
    expect(productHeaderLinks(chrome, 'platform', cta).map((l) => l.label)).toEqual(['Features'])
  })
})
