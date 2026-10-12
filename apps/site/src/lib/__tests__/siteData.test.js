import { describe, it, expect } from 'vitest'
import { activeProductsInOrder, contentMap, withReferral, readReferralCode, signInLinks } from '../siteData.js'

const rows = [
  { slug: 'simulator', name: 'Simulator', sort_order: 20, is_active: true, landing_url: 'https://s/', sign_in_url: 'https://s/login' },
  { slug: 'planner', name: 'Planner', sort_order: 30, is_active: false, landing_url: 'https://pl/' },
  { slug: 'platform', name: 'Platform', sort_order: 10, is_active: true, landing_url: 'https://p/', sign_in_url: 'https://p/login' },
  { slug: 'zeta', name: 'Zeta', sort_order: 10, is_active: true, landing_url: 'https://z/' },
  { slug: 'admin', name: 'Admin', sort_order: 1, is_active: true, landing_url: 'https://a/' },
]

describe('activeProductsInOrder', () => {
  it('keeps active rows, sorted by sort_order then name (rule 40.1 fallback)', () => {
    expect(activeProductsInOrder(rows).map((r) => r.slug)).toEqual(['platform', 'zeta', 'simulator'])
  })

  it('never lists the Admin app, even if a row exists', () => {
    expect(activeProductsInOrder(rows).some((r) => r.slug === 'admin')).toBe(false)
  })

  it('hides an inactive Planner until it is switched on', () => {
    expect(activeProductsInOrder(rows).some((r) => r.slug === 'planner')).toBe(false)
    const launched = rows.map((r) => (r.slug === 'planner' ? { ...r, is_active: true } : r))
    expect(activeProductsInOrder(launched).some((r) => r.slug === 'planner')).toBe(true)
  })

  it('returns [] for missing data', () => {
    expect(activeProductsInOrder(null)).toEqual([])
  })
})

describe('contentMap', () => {
  it('maps active keys to values', () => {
    const map = contentMap([
      { content_key: 'hero.heading', content_value: 'Hello', is_active: true },
      { content_key: 'old', content_value: 'x', is_active: false },
    ])
    expect(map).toEqual({ 'hero.heading': 'Hello' })
  })
})

describe('referral pass-through', () => {
  it('reads a valid ?ref= code and ignores junk', () => {
    expect(readReferralCode('?ref=ABC123')).toBe('ABC123')
    expect(readReferralCode('?ref=<script>')).toBeNull()
    expect(readReferralCode('')).toBeNull()
  })

  it('appends ref to product links without losing existing query params', () => {
    expect(withReferral('https://p/', 'ABC123')).toBe('https://p/?ref=ABC123')
    expect(withReferral('https://p/login?next=x', 'ABC123')).toBe('https://p/login?next=x&ref=ABC123')
    expect(withReferral('https://p/', null)).toBe('https://p/')
  })
})

describe('signInLinks', () => {
  it('lists active products that have a sign-in URL', () => {
    expect(signInLinks(rows).map((r) => r.slug)).toEqual(['platform', 'simulator'])
  })
})
