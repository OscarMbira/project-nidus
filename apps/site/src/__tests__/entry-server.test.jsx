// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { render } from '../entry-server.jsx'

describe('server render (prerender)', () => {
  it('produces HTML with every active product and the hero copy, without browser APIs', () => {
    const html = render({
      products: [
        { slug: 'platform', name: 'Project Nidus Platform', landing_url: 'https://p/', sign_in_url: 'https://p/login', sort_order: 10, is_active: true },
        { slug: 'simulator', name: 'Project Nidus Simulator', landing_url: 'https://s/', sort_order: 20, is_active: true },
        { slug: 'planner', name: 'Project Nidus Planner', landing_url: 'https://pl/', sort_order: 30, is_active: false },
      ],
      content: [{ content_key: 'hero.heading', content_value: 'Plan, deliver, learn', is_active: true }],
    })
    expect(html).toContain('Project Nidus Platform')
    expect(html).toContain('Project Nidus Simulator')
    expect(html).toContain('href="https://p/"')
    expect(html).toContain('Plan, deliver, learn')
    expect(html).not.toContain('Project Nidus Planner')
  })
})
