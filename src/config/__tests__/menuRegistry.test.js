import { describe, it, expect } from 'vitest'
import {
  MENU_REGISTRY,
  getMenuRegistryEntries,
  getRegistryFallbackEntries,
  getRegistryEntriesForCategory,
} from '../menuRegistry'
import { applyRegistryCategoryFallback, collectMenuRoutePaths, applySimulatorRegistryFallback } from '../menuRegistryUtils'
import { applySimulatorMenuTransform } from '../../hooks/useMenu'
import { PMO_CATEGORY_DEFS } from '../pmoSidebarCategories'

describe('menuRegistry', () => {
  it('has unique menu_code values', () => {
    const codes = MENU_REGISTRY.map((e) => e.menu_code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('includes initiation and process template PMO entries', () => {
    const codes = MENU_REGISTRY.map((e) => e.menu_code)
    expect(codes).toContain('pmo_init_business_case')
    expect(codes).toContain('pmo_pt_hub')
    expect(codes).toContain('pm_init_business_case')
  })

  it('getRegistryEntriesForCategory returns initiation leaves', () => {
    const leaves = getRegistryEntriesForCategory('pmo-cat-initiation')
    expect(leaves.length).toBeGreaterThanOrEqual(3)
    expect(leaves.every((e) => e.route_path?.startsWith('/pmo/initiation/')))
  })

  it('getRegistryFallbackEntries filters platform domain', () => {
    const fallbacks = getRegistryFallbackEntries('platform')
    expect(fallbacks.length).toBeGreaterThan(0)
    expect(fallbacks.every((e) => e.registry_fallback && e.route_path))
  })

  it('getMenuRegistryEntries returns platform-only by default', () => {
    const platform = getMenuRegistryEntries('platform')
    expect(platform.every((e) => e.domain === 'platform')).toBe(true)
  })
})

describe('menuRegistryUtils', () => {
  it('collectMenuRoutePaths walks nested children', () => {
    const paths = collectMenuRoutePaths([
      { route_path: '/a', children: [{ route_path: '/b' }] },
    ])
    expect(paths.has('/a')).toBe(true)
    expect(paths.has('/b')).toBe(true)
  })

  it('applyRegistryCategoryFallback injects missing initiation item', () => {
    const grouped = new Map([['pmo-cat-initiation', []]])
    const pushed = []
    const pushVirtual = (cat, label, path) => {
      pushed.push({ cat, label, path })
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat).push({ menu_label: label, route_path: path })
    }
    applyRegistryCategoryFallback(grouped, pushVirtual, new Set(), 'platform')
    const initiationPaths = pushed.filter((p) => p.cat === 'pmo-cat-initiation').map((p) => p.path)
    expect(initiationPaths).toContain('/pmo/initiation/business-case')
  })
})

describe('simulator menuRegistry', () => {
  it('includes simulator initiation and process template entries', () => {
    const sim = getMenuRegistryEntries('simulator')
    const codes = sim.map((e) => e.menu_code)
    expect(codes).toContain('sim_pmo_init_business_case')
    expect(codes).toContain('sim_pmo_pt_hub')
    expect(codes).toContain('sim_pm_init_business_case')
    expect(codes).toContain('sim_pm_pt_hub')
  })

  it('getRegistryFallbackEntries returns simulator domain entries', () => {
    const fallbacks = getRegistryFallbackEntries('simulator')
    expect(fallbacks.length).toBeGreaterThan(0)
    expect(fallbacks.every((e) => e.domain === 'simulator')).toBe(true)
  })
})

describe('simulator menu transforms', () => {
  it('applySimulatorMenuTransform keeps only simulator PMO paths', () => {
    const tree = applySimulatorMenuTransform([
      { menu_code: 'pmo_init', route_path: '/pmo/initiation/business-case', sort_order: 1, children: [] },
      { menu_code: 'sim_pmo_init', route_path: '/simulator/pmo/initiation/business-case', sort_order: 2, children: [] },
    ], 'pmo')
    expect(tree.some((n) => n.route_path?.includes('/simulator/pmo/'))).toBe(true)
    expect(tree.some((n) => /^\/pmo\//.test(n.route_path || ''))).toBe(false)
  })

  it('applySimulatorRegistryFallback injects missing sim initiation leaf', () => {
    const tree = applySimulatorRegistryFallback([], 'pmo')
    const paths = collectMenuRoutePaths(tree)
    expect(paths.has('/simulator/pmo/initiation/business-case')).toBe(true)
  })
})

describe('pmoSidebarCategories', () => {
  it('defines initiation and process templates categories', () => {
    const ids = PMO_CATEGORY_DEFS.map((c) => c.id)
    expect(ids).toContain('pmo-cat-initiation')
    expect(ids).toContain('pmo-cat-process-templates')
  })
})
