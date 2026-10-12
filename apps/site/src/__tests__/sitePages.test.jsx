// @vitest-environment jsdom
// v1241 Amendment A — brand-site routes, shared layout, common pages and the contact form.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import App from '../App.jsx'
import { matchRoute, routePaths, routeMeta } from '../lib/routes.js'
import { validateEnquiry } from '../pages/SitePages.jsx'

const data = {
  products: [
    { slug: 'platform', name: 'Project Nidus Platform', tagline: 'Full PMIS', landing_url: 'https://p/', sign_in_url: 'https://p/login', sign_up_url: 'https://p/register', pricing_url: 'https://p/pricing', icon_key: 'layout-dashboard', accent_key: 'blue', sort_order: 10, is_active: true },
    { slug: 'planner', name: 'Project Nidus Planner', tagline: 'Planning', landing_url: 'https://pl/', sign_in_url: 'https://pl/login', sign_up_url: 'https://pl/signup', pricing_url: 'https://pl/pricing', icon_key: 'calendar-range', accent_key: 'violet', sort_order: 30, is_active: true },
  ],
  content: [
    { content_key: 'hero.heading', content_value: 'One family', is_active: true },
    { content_key: 'brand.url', content_value: 'https://nidus.test/', is_active: true },
    { content_key: 'footer.tagline', content_value: 'Plan, deliver, learn.', is_active: true },
  ],
  navLinks: [
    { link_key: 'company.about', nav_group: 'company', label: 'About', page_slug: 'about', url: null, sort_order: 10, is_active: true },
    { link_key: 'company.contact', nav_group: 'company', label: 'Contact', page_slug: 'contact', url: null, sort_order: 20, is_active: true },
    { link_key: 'resources.docs', nav_group: 'resources', label: 'Platform documentation', page_slug: null, url: 'https://p/docs', sort_order: 10, is_active: true },
    { link_key: 'footer.legal.terms', nav_group: 'footer_legal', label: 'Terms of Service', page_slug: 'terms', url: null, sort_order: 10, is_active: true },
    { link_key: 'footer.company.about', nav_group: 'footer_company', label: 'About', page_slug: 'about', url: null, sort_order: 10, is_active: true },
  ],
  pages: [
    { slug: 'about', title: 'About Project Nidus', summary: 'Who we are', body_md: '## Mission\n\nWe help teams. See [docs](https://p/docs).', page_kind: 'page', is_active: true },
    { slug: 'contact', title: 'Contact us', summary: 'Talk to us', body_md: '', page_kind: 'contact', is_active: true },
    { slug: 'solutions/pmo', title: 'For PMOs', summary: 'Oversight', body_md: 'Text', page_kind: 'solution', is_active: true },
    { slug: 'terms', title: 'Terms of Service', summary: '', body_md: '', page_kind: 'legal', is_active: false },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  // The browser refresh after load: keep the same data so the page stays as rendered.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
})

describe('routes', () => {
  it('matches home, pricing, contact, pages and not-found', () => {
    expect(matchRoute('/', data).kind).toBe('home')
    expect(matchRoute('/pricing', data).kind).toBe('pricing')
    expect(matchRoute('/contact', data).kind).toBe('contact')
    expect(matchRoute('/about/', data)).toMatchObject({ kind: 'page', page: { slug: 'about' } })
    expect(matchRoute('/solutions/pmo', data).page.title).toBe('For PMOs')
    expect(matchRoute('/terms', data).kind).toBe('notfound') // inactive page
    expect(matchRoute('/nope', data).kind).toBe('notfound')
  })

  it('prerenders every active page once', () => {
    // v1263: /blog is a built-in route (blog list), always prerendered.
    expect(routePaths(data)).toEqual(['', 'pricing', 'contact', 'blog', 'about', 'solutions/pmo'])
  })

  it('gives each page its own title and description', () => {
    expect(routeMeta(matchRoute('/about', data), data)).toEqual({ title: 'About Project Nidus — Project Nidus', description: 'Who we are' })
  })
})

describe('layout', () => {
  it('server-renders the shared header and footer around a content page', () => {
    const html = renderToString(<App initialData={data} path="/about" />)
    expect(html).toContain('About Project Nidus')
    expect(html).toContain('Mission')
    expect(html).toContain('Get started')
    expect(html).toContain('© ')
  })

  it('keeps brand-site links in the same window and opens other applications in a new one', () => {
    render(<App initialData={data} path="/about" />)
    const footer = screen.getByRole('contentinfo')
    const about = within(footer).getAllByRole('link', { name: 'About' })[0]
    expect(about.getAttribute('href')).toBe('/about')
    expect(about.getAttribute('target')).toBeNull()
    const platform = within(footer).getByRole('link', { name: /Project Nidus Platform/ })
    expect(platform.getAttribute('target')).toBe('_blank')
    // A markdown link to another app also opens in a new window.
    expect(screen.getByRole('link', { name: /^docs/ }).getAttribute('target')).toBe('_blank')
  })

  it('never links an inactive page (Terms) in the footer', () => {
    render(<App initialData={data} path="/" />)
    expect(screen.queryByRole('link', { name: 'Terms of Service' })).toBeNull()
  })

  it('shows a not-found page for unknown addresses', () => {
    render(<App initialData={data} path="/missing" />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
  })
})

describe('pricing', () => {
  it('compares products and links to each product pricing page in a new window', () => {
    render(<App initialData={data} path="/pricing" />)
    const links = screen.getAllByRole('link', { name: /See plans/ })
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['https://p/pricing', 'https://pl/pricing'])
    expect(links.every((l) => l.getAttribute('target') === '_blank')).toBe(true)
  })
})

describe('contact form', () => {
  it('checks the form before sending', () => {
    expect(validateEnquiry({ fullName: '', email: 'a@b.co', message: 'Hello there team' })).toMatch(/name/)
    expect(validateEnquiry({ fullName: 'Ann', email: 'bad', message: 'Hello there team' })).toMatch(/email/)
    expect(validateEnquiry({ fullName: 'Ann', email: 'a@b.co', message: 'short' })).toMatch(/more/)
    expect(validateEnquiry({ fullName: 'Ann', email: 'a@b.co', message: 'Hello there team' })).toBeNull()
  })

  it('sends the message to site_submit_enquiry and shows the reference', async () => {
    const fetchMock = vi.fn(async (url) => (String(url).includes('/rpc/site_submit_enquiry')
      ? { ok: true, json: async () => ({ received: true, reference: 'AB12CD34' }) }
      : { ok: true, json: async () => [] }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialData={data} path="/contact" />)
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Ann' } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'ann@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Please tell me about the Planner.' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/ }))
    await waitFor(() => expect(screen.getByText(/AB12CD34/)).toBeTruthy())
    const call = fetchMock.mock.calls.find(([u]) => String(u).includes('/rpc/site_submit_enquiry'))
    expect(JSON.parse(call[1].body)).toMatchObject({ p_full_name: 'Ann', p_email: 'ann@example.com', p_topic: 'general' })
  })
})
