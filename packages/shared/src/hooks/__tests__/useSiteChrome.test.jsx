/**
 * Public header menus — stale-while-revalidate cache: drawn instantly from the last load, refreshed
 * in the background when older than 10 minutes, never blank on a failed refresh.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SITE_CHROME_CACHE_KEY, getSiteChromeRowsCached } from '../../site/siteChrome.js'
import { useSiteChrome } from '../useSiteChrome'

const ROWS = {
  products: [{ slug: 'platform', name: 'Project Nidus Platform', is_active: true, sort_order: 1 }],
  content: [], pages: [], headers: [],
  navLinks: [{ link_key: 'company.about', nav_group: 'company', label: 'About', page_slug: 'about', sort_order: 1, is_active: true }],
}
const UPDATED = { ...ROWS, products: [{ ...ROWS.products[0], name: 'Renamed in Admin' }] }

function mockDatabase(rows) {
  const tables = { site_products: rows.products, site_content: rows.content, site_nav_links: rows.navLinks, site_pages: rows.pages, site_header_settings: rows.headers }
  return vi.fn(async (url) => {
    const table = Object.keys(tables).find((t) => String(url).includes(`/rest/v1/${t}?`))
    return { ok: true, status: 200, json: async () => tables[table] }
  })
}
const store = (rows, ageMs) => localStorage.setItem(SITE_CHROME_CACHE_KEY, JSON.stringify({ at: Date.now() - ageMs, rows }))
const productNames = (chrome) => JSON.stringify(chrome)

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('useSiteChrome (stale-while-revalidate)', () => {
  it('draws the menus on the first render from the last load, without asking the database', () => {
    store(ROWS, 60_000)
    const fetchMock = mockDatabase(UPDATED)
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useSiteChrome())
    expect(result.current).not.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows old menus at once, then the refreshed ones', async () => {
    store(ROWS, 11 * 60_000)
    vi.stubGlobal('fetch', mockDatabase(UPDATED))
    const { result } = renderHook(() => useSiteChrome())
    expect(productNames(result.current)).toContain('Project Nidus Platform')
    await waitFor(() => expect(productNames(result.current)).toContain('Renamed in Admin'))
    expect(JSON.parse(localStorage.getItem(SITE_CHROME_CACHE_KEY)).rows.products[0].name).toBe('Renamed in Admin')
  })

  it('keeps the menus already shown when the refresh fails', async () => {
    store(ROWS, 11 * 60_000)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => [] })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useSiteChrome())
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(productNames(result.current)).toContain('Project Nidus Platform')
  })

  it('loads from the database on a browser’s first visit', async () => {
    vi.stubGlobal('fetch', mockDatabase(ROWS))
    const { result } = renderHook(() => useSiteChrome())
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(await getSiteChromeRowsCached({ baseUrl: 'x', anonKey: 'y' })).toEqual(ROWS) // now fresh in the cache
  })
})
