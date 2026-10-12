// @vitest-environment jsdom
// v1262 — marketing section pages (home + Solutions), preview mode and the Contact topic preset.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import App from '../App.jsx'
import SectionPage from '../sections/SectionPage.jsx'

const products = [
  { slug: 'platform', name: 'Project Nidus Platform', tagline: 'Full PMIS', landing_url: 'https://p/', sign_up_url: 'https://p/register', icon_key: 'layout-dashboard', accent_key: 'blue', sort_order: 10, is_active: true },
  { slug: 'planner', name: 'Project Nidus Planner', tagline: 'Planning', landing_url: 'https://pl/', sign_up_url: 'https://pl/signup', icon_key: 'calendar-range', accent_key: 'violet', sort_order: 30, is_active: true },
]

const s = (key, type, extra = {}, page = 'home', order = 10) => ({
  id: key, page_slug: page, section_key: key, section_type: type, sort_order: order, is_active: true, items: [], ...extra,
})

const homeSections = [
  s('hero', 'hero', { heading: 'Projects, delivered', subheading: 'One family', primary_cta: { label: 'Get started', href: '#get-started' }, secondary_cta: { label: 'Book a demo', href: '/contact?topic=sales' } }, 'home', 10),
  s('trust', 'trust_strip', { heading: 'Trusted by' }, 'home', 20),
  s('value', 'value_points', { heading: 'Why Nidus', items: [{ title: 'One record', text: 'No re-keying', icon: 'link' }] }, 'home', 30),
  s('products', 'product_cards', { heading: 'Choose your product' }, 'home', 40),
  s('features', 'feature_grid', { heading: 'Features', items: [{ title: 'Planning Hub', text: 'Gantt', icon: 'calendar-range' }] }, 'home', 50),
  s('how', 'steps', { heading: 'How it works', items: [{ title: 'Start with Planner' }, { title: 'Move to Platform' }] }, 'home', 60),
  s('audiences', 'audience_links', { heading: 'Solutions', items: [{ title: 'For PMOs', text: 'Oversight', href: '/solutions/pmo', icon: 'briefcase' }] }, 'home', 70),
  s('quotes', 'testimonials', { heading: 'Customers', items: [] }, 'home', 80),
  s('pricing', 'pricing_teaser', { heading: 'Plans for every team', primary_cta: { label: 'Compare plans', href: '/pricing' } }, 'home', 90),
  s('faq', 'faq', { heading: 'Questions', items: [{ title: 'Is there a free trial?', text: 'Yes, 14 days.' }] }, 'home', 100),
  s('cta', 'cta_band', { heading: 'Ready?', primary_cta: { label: 'Get started', href: '#get-started' } }, 'home', 110),
]

const data = {
  products,
  content: [{ content_key: 'hero.heading', content_value: 'Old hero', is_active: true }],
  navLinks: [],
  pages: [
    { slug: 'solutions/pmo', title: 'For PMOs', summary: 'Oversight', body_md: 'Markdown body text', page_kind: 'solution', is_active: true },
    { slug: 'about', title: 'About', summary: '', body_md: 'About body', page_kind: 'page', is_active: true },
    { slug: 'contact', title: 'Contact us', summary: '', body_md: '', page_kind: 'contact', is_active: true },
  ],
  sections: [...homeSections, s('pmo-hero', 'hero', { heading: 'Run a PMO with confidence' }, 'solutions/pmo', 10)],
}

beforeEach(() => {
  vi.restoreAllMocks()
  // Browser refresh after load returns the same rows, so the page stays as rendered.
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const table = String(url).match(/rest\/v1\/([a-z_]+)/)?.[1]
    const map = { site_products: data.products, site_content: data.content, site_nav_links: [], site_pages: data.pages, site_sections: data.sections }
    return { ok: true, json: async () => map[table] || [] }
  }))
})
afterEach(() => window.history.replaceState({}, '', '/'))

describe('section page', () => {
  it('renders the sections in order and skips empty gated ones', () => {
    const { container } = render(<SectionPage sections={homeSections} data={data} />)
    const types = [...container.querySelectorAll('section[data-section-type]')].map((n) => n.dataset.sectionType)
    expect(types).toEqual(['hero', 'value_points', 'product_cards', 'feature_grid', 'steps', 'audience_links', 'pricing_teaser', 'faq', 'cta_band'])
    expect(screen.getByRole('heading', { level: 1, name: 'Projects, delivered' })).toBeTruthy()
    expect(screen.getAllByTestId('product-card')).toHaveLength(2)
  })

  it('hero buttons: Get started opens the chooser, Book a demo goes to Contact with Sales', () => {
    render(<SectionPage sections={homeSections} data={data} />)
    expect(screen.getByRole('link', { name: 'Book a demo' }).getAttribute('href')).toBe('/contact?topic=sales')
    fireEvent.click(screen.getAllByRole('button', { name: /Get started/ })[0])
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('FAQ answers open and close from their question button', () => {
    render(<SectionPage sections={homeSections} data={data} />)
    const q = screen.getByRole('button', { name: 'Is there a free trial?' })
    expect(q.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Yes, 14 days.').hidden).toBe(false)
  })

  it('audience cards link to their page; anchors get the section key as id', () => {
    const { container } = render(<SectionPage sections={homeSections} data={data} />)
    expect(screen.getByRole('link', { name: /For PMOs/ }).getAttribute('href')).toBe('/solutions/pmo')
    expect(container.querySelector('#how')).toBeTruthy()
  })

  it('renders on the server (prerender)', () => {
    expect(renderToString(<SectionPage sections={homeSections} data={data} />)).toContain('Projects, delivered')
  })
})

describe('routing', () => {
  it('home uses sections when published, otherwise the original page', () => {
    render(<App initialData={data} path="/" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Projects, delivered' })).toBeTruthy()
    expect(screen.queryByText('Old hero')).toBeNull()
  })

  it('home without sections keeps the original page', () => {
    render(<App initialData={{ ...data, sections: [] }} path="/" />)
    expect(screen.getByText('Old hero')).toBeTruthy()
  })

  it('a Solutions page with sections renders them; a page without keeps its Markdown', () => {
    const { unmount } = render(<App initialData={data} path="/solutions/pmo" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Run a PMO with confidence' })).toBeTruthy()
    expect(screen.queryByText('Markdown body text')).toBeNull()
    unmount()
    render(<App initialData={data} path="/about" />)
    expect(screen.getByText('About body')).toBeTruthy()
  })
})

describe('preview', () => {
  it('shows drafts and a banner with a valid preview link', async () => {
    window.history.replaceState({}, '', '/?preview=' + 'a'.repeat(48))
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('rpc/site_preview_sections')) return { ok: true, json: async () => [s('hero', 'hero', { heading: 'Draft hero' })] }
      const table = String(url).match(/rest\/v1\/([a-z_]+)/)?.[1]
      return { ok: true, json: async () => ({ site_products: products, site_sections: data.sections, site_pages: data.pages })[table] || [] }
    }))
    render(<App initialData={data} path="/" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Draft hero' })).toBeTruthy()
    expect(screen.getByText(/unpublished drafts/)).toBeTruthy()
  })

  it('explains an expired preview link instead of showing the page', async () => {
    window.history.replaceState({}, '', '/?preview=' + 'b'.repeat(48))
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('rpc/site_preview_sections')) return { ok: false, json: async () => ({ message: 'This preview link has expired or is not valid.' }) }
      return { ok: true, json: async () => [] }
    }))
    render(<App initialData={data} path="/" />)
    expect(await screen.findByText('This preview link has expired or is not valid.')).toBeTruthy()
  })
})

describe('contact topic', () => {
  it('?topic=sales preselects Sales and pricing', async () => {
    window.history.replaceState({}, '', '/contact?topic=sales')
    render(<App initialData={data} path="/contact" />)
    const select = screen.getByLabelText(/Topic/)
    await waitFor(() => expect(select.value).toBe('sales'))
    expect(within(select).getByRole('option', { name: 'Sales and pricing' }).selected).toBe(true)
  })
})
