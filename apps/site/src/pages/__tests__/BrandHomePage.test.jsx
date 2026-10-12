// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import BrandHomePage from '../BrandHomePage.jsx'

const data = {
  products: [
    { slug: 'simulator', name: 'Project Nidus Simulator', tagline: 'Practise', description: 'Sim desc', audience: 'Learners', landing_url: 'https://s/', sign_in_url: 'https://s/login', sign_up_url: 'https://s/register', icon_key: 'graduation-cap', accent_key: 'green', sort_order: 20, is_active: true },
    { slug: 'platform', name: 'Project Nidus Platform', tagline: 'Full PMIS', description: 'Plat desc', audience: 'PMOs', landing_url: 'https://p/', sign_in_url: 'https://p/login', sign_up_url: 'https://p/register', icon_key: 'layout-dashboard', accent_key: 'blue', sort_order: 10, is_active: true },
    { slug: 'planner', name: 'Project Nidus Planner', tagline: 'Planning', landing_url: 'https://pl/', sort_order: 30, is_active: false },
  ],
  content: [
    { content_key: 'hero.heading', content_value: 'One family of PM products', is_active: true },
    { content_key: 'hero.subheading', content_value: 'Start small, grow.', is_active: true },
    { content_key: 'connect.heading', content_value: 'How the products connect', is_active: true },
    { content_key: 'connect.body', content_value: 'They share projects.', is_active: true },
    { content_key: 'footer.tagline', content_value: 'Plan, deliver, learn.', is_active: true },
  ],
}

describe('BrandHomePage', () => {
  it('renders hero copy from site_content', () => {
    render(<BrandHomePage data={data} />)
    expect(screen.getByRole('heading', { level: 1, name: 'One family of PM products' })).toBeTruthy()
    expect(screen.getByText('Start small, grow.')).toBeTruthy()
  })

  it('renders one card per active product, in sort order, linking to its landing page', () => {
    render(<BrandHomePage data={data} />)
    const cards = screen.getAllByTestId('product-card')
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Project Nidus Platform',
      'Project Nidus Simulator',
    ])
    expect(within(cards[0]).getByRole('link', { name: /learn more/i }).getAttribute('href')).toBe('https://p/')
  })

  it('does not show the inactive Planner card or any Admin link', () => {
    render(<BrandHomePage data={data} />)
    expect(screen.queryByText('Project Nidus Planner')).toBeNull()
    expect(screen.queryByText(/admin/i)).toBeNull()
  })

  // Sign-in links moved to the shared header (packages/ui NidusSiteHeader, Amendment A).
  it('opens product links in a new window (each product is another application)', () => {
    render(<BrandHomePage data={data} />)
    const card = screen.getAllByTestId('product-card')[0]
    for (const link of within(card).getAllByRole('link')) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })

  it('passes an affiliate code through to product links', () => {
    render(<BrandHomePage data={data} refCode="ABCD12" />)
    const card = screen.getAllByTestId('product-card')[0]
    expect(within(card).getByRole('link', { name: /learn more/i }).getAttribute('href')).toBe('https://p/?ref=ABCD12')
  })
})
