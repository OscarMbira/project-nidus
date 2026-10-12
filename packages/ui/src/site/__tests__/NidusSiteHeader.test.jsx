// v1241 Amendment A / v1264 — shared public header: brand + product layouts, dropdowns, new-window rule, mobile menu, chooser, colours.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { buildSiteChrome } from '@nidus/shared/site/siteChrome.js'
import NidusSiteHeader from '../NidusSiteHeader.jsx'
import NidusSiteFooter from '../NidusSiteFooter.jsx'

const chrome = buildSiteChrome({
  products: [
    { slug: 'platform', name: 'Project Nidus Platform', tagline: 'Full PMIS', landing_url: 'https://p/', sign_in_url: 'https://p/login', sign_up_url: 'https://p/register', icon_key: 'layout-dashboard', sort_order: 10, is_active: true },
    { slug: 'planner', name: 'Project Nidus Planner', tagline: 'Planning', landing_url: 'https://pl/', sign_in_url: 'https://pl/login', sign_up_url: 'https://pl/signup', icon_key: 'calendar-range', sort_order: 30, is_active: true },
  ],
  content: [{ content_key: 'brand.url', content_value: 'https://nidus.test/', is_active: true }],
  navLinks: [
    { link_key: 's', nav_group: 'solutions', label: 'For PMOs', page_slug: 'solutions/pmo', sort_order: 10 },
    { link_key: 'r', nav_group: 'resources', label: 'Platform documentation', url: 'https://p/docs', sort_order: 10 },
    { link_key: 'c', nav_group: 'company', label: 'About', page_slug: 'about', sort_order: 10 },
    { link_key: 'fr', nav_group: 'footer_resources', label: 'Platform documentation', url: 'https://p/docs', sort_order: 10 },
    { link_key: 'fl', nav_group: 'footer_legal', label: 'Privacy Policy', page_slug: 'privacy', sort_order: 10 },
  ],
  pages: [{ slug: 'solutions/pmo', is_active: true }, { slug: 'about', is_active: true }, { slug: 'privacy', is_active: true }],
})

// v1264: the same chrome plus Platform's own links and header settings.
const productChrome = buildSiteChrome({
  products: chrome.products,
  content: [{ content_key: 'brand.url', content_value: 'https://nidus.test/', is_active: true }],
  navLinks: [
    { link_key: 's', nav_group: 'solutions', label: 'For PMOs', page_slug: 'solutions/pmo', sort_order: 10 },
    { link_key: 'c', nav_group: 'company', label: 'About', page_slug: 'about', sort_order: 10 },
    { link_key: 'pf', nav_group: 'product_platform', label: 'Features', url: '/platform/features', sort_order: 10 },
    { link_key: 'pp', nav_group: 'product_platform', label: 'Pricing', url: '/platform/pricing', sort_order: 20 },
    { link_key: 'pd', nav_group: 'product_platform', label: 'Request a demo', url: '/platform/request-demo', sort_order: 40 },
  ],
  pages: [{ slug: 'solutions/pmo', is_active: true }, { slug: 'about', is_active: true }],
  headers: [
    { scope_slug: 'platform', bg_color: '#0B1220', text_color: '#E5E7EB', accent_color: '#2563EB', cta_text_color: '#FFFFFF', cta_label: 'Request a demo', cta_url: '/platform/request-demo', is_active: true },
    { scope_slug: 'planner', bg_color: '#FFFFFF', text_color: '#111827', accent_color: '#6D28D9', cta_text_color: '#FFFFFF', cta_label: 'Start free trial', cta_url: null, is_active: true },
  ],
})

const desktopNav = () => screen.getAllByRole('navigation', { name: 'Main' })[0]

describe('NidusSiteHeader', () => {
  it('shows Products, Solutions, Pricing, Resources and Company', () => {
    render(<NidusSiteHeader chrome={chrome} onBrandSite />)
    const nav = desktopNav()
    for (const label of ['Products', 'Solutions', 'Resources', 'Company']) expect(within(nav).getByRole('button', { name: label })).toBeTruthy()
    expect(within(nav).getByRole('link', { name: 'Pricing' }).getAttribute('href')).toBe('/pricing')
  })

  it('opens a dropdown and closes it with Escape', () => {
    render(<NidusSiteHeader chrome={chrome} onBrandSite />)
    const btn = within(desktopNav()).getByRole('button', { name: 'Company' })
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: /About/ }).getAttribute('href')).toBe('/about')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('collapses the four groups into one mobile menu; Sign in and Get started stay outside it', () => {
    render(<NidusSiteHeader chrome={chrome} onBrandSite />)
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const menus = screen.getAllByRole('navigation', { name: 'Main' })
    const mobile = menus[menus.length - 1]
    for (const heading of ['Products', 'Solutions', 'Resources', 'Company']) expect(within(mobile).getByText(heading)).toBeTruthy()
    expect(within(mobile).getByRole('link', { name: 'Pricing' })).toBeTruthy()
  })

  it('Get started opens the product chooser with each sign-up link', () => {
    render(<NidusSiteHeader chrome={chrome} onBrandSite />)
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    const dialog = screen.getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['https://p/register', 'https://pl/signup'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows only the logo when menus could not be loaded (no invented links)', () => {
    render(<NidusSiteHeader chrome={null} />)
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull()
    expect(screen.getByText('Nidus')).toBeTruthy()
  })
})

describe('NidusSiteHeader — product layout (v1264)', () => {
  it('shows one row: the product and its own links, no company dropdowns, no second bar', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    const nav = desktopNav()
    expect(within(nav).getByRole('link', { name: 'Features' }).getAttribute('href')).toBe('/platform/features')
    expect(within(nav).getByRole('link', { name: 'Pricing' }).getAttribute('href')).toBe('/platform/pricing')
    for (const label of ['Products', 'Solutions', 'Resources', 'Company']) expect(within(nav).queryByRole('button', { name: label })).toBeNull()
    expect(within(nav).getByRole('button', { name: 'Project Nidus' })).toBeTruthy()
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Project Nidus Platform' }).textContent).toBe('Platform') // under the wordmark
  })

  it('hides a product link that duplicates the CTA and shows the configured CTA', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    expect(within(desktopNav()).queryByRole('link', { name: 'Request a demo' })).toBeNull()
    const cta = screen.getByRole('link', { name: 'Request a demo' })
    expect(cta.getAttribute('href')).toBe('/platform/request-demo')
    expect(cta.getAttribute('target')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull()
  })

  it('signs in directly to this product, in the same window', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    const signIn = screen.getByRole('link', { name: /Sign in/ })
    expect(signIn.getAttribute('href')).toBe('https://p/login')
    expect(signIn.getAttribute('target')).toBeNull()
    expect(screen.queryByRole('button', { name: /Sign in/ })).toBeNull()
  })

  it('Project Nidus ▾ lists other products, Compare products and company links in new windows', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    fireEvent.click(within(desktopNav()).getByRole('button', { name: 'Project Nidus' }))
    const planner = screen.getAllByRole('link', { name: /Project Nidus Planner/ })[0]
    expect(planner.getAttribute('href')).toBe('https://pl/')
    expect(planner.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: /Compare products/ }).getAttribute('href')).toBe('https://nidus.test/pricing')
    const pmo = screen.getByRole('link', { name: /For PMOs/ })
    expect(pmo.getAttribute('href')).toBe('https://nidus.test/solutions/pmo')
    expect(pmo.getAttribute('target')).toBe('_blank')
  })

  it('falls back to the product sign-up when no CTA address is set', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="planner" />)
    const cta = screen.getByRole('link', { name: 'Start free trial' })
    expect(cta.getAttribute('href')).toBe('https://pl/signup')
    expect(cta.getAttribute('target')).toBeNull()
  })

  it('applies the header colours as CSS variables; light backgrounds drop the dark class', () => {
    const { container, unmount } = render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    let header = container.querySelector('header')
    expect(header.style.getPropertyValue('--nh-bg')).toBe('#0B1220')
    expect(header.classList.contains('dark')).toBe(true)
    unmount()
    header = render(<NidusSiteHeader chrome={productChrome} currentProduct="planner" />).container.querySelector('header')
    expect(header.style.getPropertyValue('--nh-bg')).toBe('#FFFFFF')
    expect(header.classList.contains('dark')).toBe(false)
  })

  it('uses built-in colours when a header has no settings row', () => {
    const { container } = render(<NidusSiteHeader chrome={chrome} onBrandSite />)
    expect(container.querySelector('header').style.getPropertyValue('--nh-bg')).toBe('#030712')
  })

  it('mobile menu: product links first, then a Project Nidus section; Sign in and CTA stay outside', () => {
    render(<NidusSiteHeader chrome={productChrome} currentProduct="platform" />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const menus = screen.getAllByRole('navigation', { name: 'Main' })
    const mobile = menus[menus.length - 1]
    const labels = within(mobile).getAllByRole('link').map((l) => l.textContent)
    expect(labels.indexOf('Features')).toBeLessThan(labels.findIndex((t) => /Project Nidus Planner/.test(t)))
    expect(within(mobile).getByText('Other products')).toBeTruthy()
    expect(within(mobile).queryByRole('link', { name: /Sign in$/ })).toBeNull()
  })
})

describe('NidusSiteFooter', () => {
  it('renders product, resource, company and legal columns with the copyright', () => {
    render(<NidusSiteFooter chrome={chrome} onBrandSite year={2026} />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy')
    expect(within(footer).getByRole('link', { name: /Platform documentation/ }).getAttribute('target')).toBe('_blank')
    expect(within(footer).getByText(/© 2026 Project Nidus/)).toBeTruthy()
  })
})
