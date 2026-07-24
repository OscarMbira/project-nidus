import { describe, it, expect } from 'vitest'
import {
  MENU_REGISTRY,
  getMenuRegistryEntries,
  getRegistryFallbackEntries,
  getRegistryEntriesForCategory,
} from '../menuRegistry'
import { applyRegistryCategoryFallback, collectMenuRoutePaths, applySimulatorRegistryFallback } from '../menuRegistryUtils'
import { stripVirtualMenuItems } from '../menuDbOnlyUtils'
import { applySimulatorMenuTransform } from '@nidus/shared/hooks/useMenu'
import {
  PMO_CATEGORY_DEFS,
  resolveRegistryCategoryId,
  METHODOLOGY_TRACK_DEFS,
} from '../pmoSidebarCategories'
import { METHODOLOGY_TRACK_CATEGORY_DEFS } from '../methodologyMenuUtils'
import { getRegistryEntryMethodology } from '../menuRegistryMethodology'

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

  it('getRegistryFallbackEntries returns empty (DB-only runtime)', () => {
    const fallbacks = getRegistryFallbackEntries('platform')
    expect(fallbacks).toEqual([])
    const simFallbacks = getRegistryFallbackEntries('simulator')
    expect(simFallbacks).toEqual([])
  })

  it('getMenuRegistryEntries returns platform-only by default', () => {
    const platform = getMenuRegistryEntries('platform')
    expect(platform.every((e) => e.domain === 'platform')).toBe(true)
  })

  it('getMenuRegistryEntries attaches methodology metadata (v671)', () => {
    const platform = getMenuRegistryEntries('platform')
    const mandate = platform.find((e) => e.menu_code === 'pmo_init_project_mandate')
    expect(mandate?.methodology).toBe('structured')
    expect(getRegistryEntryMethodology(mandate)).toBe('structured')
  })
})

describe('pmoSidebarCategories methodology (v671)', () => {
  it('exports three methodology track definitions', () => {
    expect(METHODOLOGY_TRACK_DEFS.length).toBe(3)
    expect(METHODOLOGY_TRACK_DEFS.map((d) => d.track).sort()).toEqual(['agile', 'standards_based', 'structured'])
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

  it('applyRegistryCategoryFallback is a no-op when registry fallback list is empty', () => {
    const grouped = new Map([['pmo-cat-initiation', []]])
    const pushed = []
    const pushVirtual = (cat, label, path) => {
      pushed.push({ cat, label, path })
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat).push({ menu_label: label, route_path: path })
    }
    applyRegistryCategoryFallback(grouped, pushVirtual, new Set(), 'platform')
    expect(pushed).toEqual([])
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

  it('getRegistryFallbackEntries returns empty for simulator (DB-only runtime)', () => {
    const fallbacks = getRegistryFallbackEntries('simulator')
    expect(fallbacks).toEqual([])
  })
})

function collectRoutePaths(nodes = [], paths = []) {
  for (const node of nodes) {
    if (node?.route_path) paths.push(node.route_path)
    collectRoutePaths(node.children || [], paths)
  }
  return paths
}

describe('simulator menu transforms', () => {
  it('applySimulatorMenuTransform keeps only simulator PMO paths', () => {
    const tree = applySimulatorMenuTransform([
      { menu_code: 'pmo_init', route_path: '/pmo/initiation/business-case', sort_order: 1, children: [] },
      { menu_code: 'sim_pmo_init', route_path: '/simulator/pmo/initiation/business-case', sort_order: 2, children: [] },
    ], 'pmo')
    const paths = collectRoutePaths(tree)
    expect(paths.some((p) => p.includes('/simulator/pmo/'))).toBe(true)
    expect(paths.some((p) => /^\/pmo\//.test(p))).toBe(false)
  })

  it('applySimulatorRegistryFallback does not inject virtual rows', () => {
    const tree = applySimulatorRegistryFallback([], 'pmo')
    expect(tree).toEqual([])
  })
})

describe('pmoSidebarCategories', () => {
  it('does not expose process templates as a top-level universal category', () => {
    const ids = PMO_CATEGORY_DEFS.map((c) => c.id)
    expect(ids).not.toContain('pmo-cat-process-templates')
    expect(ids).not.toContain('pmo-cat-initiation')
    expect(METHODOLOGY_TRACK_CATEGORY_DEFS.map((c) => c.id)).toContain('pmo-cat-initiation')
  })

  it('resolveRegistryCategoryId maps legacy registry ids', () => {
    expect(resolveRegistryCategoryId('pmo-cat-governance')).toBe('pmo-cat-workflows-approvals')
    expect(resolveRegistryCategoryId('pmo-cat-oversight')).toBe('pmo-cat-reporting-intelligence')
    expect(resolveRegistryCategoryId('pmo-cat-delivery')).toBe('pmo-cat-agile-lean')
    expect(resolveRegistryCategoryId('pmo-cat-strategy')).toBe('pmo-cat-knowledge-assets')
    expect(resolveRegistryCategoryId('pmo-cat-initiation')).toBe('pmo-cat-initiation')
  })
  it('stripVirtualMenuItems removes client-invented rows', () => {
    const cleaned = stripVirtualMenuItems([
      { menu_code: 'pmo_real', route_path: '/pmo/x' },
      { menu_code: 'virtual_teams_x', route_path: '/platform/teams' },
      { id: 'virtual-teams-hub', menu_code: 'teams', route_path: '/platform/teams' },
    ])
    expect(cleaned).toHaveLength(1)
    expect(cleaned[0].menu_code).toBe('pmo_real')
  })
})

describe('governance bucket integrity (v664)', () => {
  const GOVERNANCE_ALLOWED_FALLBACK_CODES = new Set([
    'pmo_gov_mandates_create',
    'pmo_gov_mandates_all',
    'pmo_gov_mandates_unlinked',
    'pmo_gov_mandate_approval',
    'pmo_gov_communication_strategy',
    'pmo_gov_configuration_strategy',
    'pmo_gov_quality_strategy',
    'pmo_gov_risk_strategy',
    'pmo_gov_itto_templates',
    'pmo_gov_itto_drafts',
    'pmo_gov_eef_list',
    'pmo_gov_eef_new',
    'pmo_gov_eef_drafts',
    'org_knowledge_eef',
    'org_knowledge_eef_new',
    'org_knowledge_eef_drafts',
    'pmo_gov_opa_list',
  ])

  const GOVERNANCE_POLLUTANT_CODES = [
    'pmo_section_procurement',
    'pmo_section_platform_config',
    'pmo_notification_prefs',
    'pmo_section_procurement_mgmt',
  ]

  it('catalogue governance registry entries exclude miscategorised gap sections', () => {
    const govCatalogue = MENU_REGISTRY.filter(
      (e) => e.domain === 'platform' && e.registry_fallback && e.category === 'pmo-cat-governance-standards'
    )
    for (const code of GOVERNANCE_POLLUTANT_CODES) {
      expect(govCatalogue.some((e) => e.menu_code === code)).toBe(false)
    }
  })

  it('catalogue governance registry entries are allowlisted target items only', () => {
    const govCatalogue = MENU_REGISTRY.filter(
      (e) => e.domain === 'platform' && e.registry_fallback && e.category === 'pmo-cat-governance-standards'
    )
    for (const entry of govCatalogue) {
      expect(GOVERNANCE_ALLOWED_FALLBACK_CODES.has(entry.menu_code)).toBe(true)
    }
  })
})
