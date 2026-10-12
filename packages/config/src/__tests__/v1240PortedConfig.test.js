/**
 * v1240 Slice 0.3 — behaviour ported from the dead apps/*\/src/config copies into packages/config.
 * These fixes were committed to the unused app copies (e699628) and never ran until v1240.
 */
import { describe, it, expect } from 'vitest'
import { MENU_REGISTRY } from '../menuRegistry'
import { getLifecycleTableConfig } from '../recordLifecycleRegistry'
import {
  applyCategorySortOrders,
  applyPmLayoutSanitization,
  dissolveExecutiveOverviewCategory,
  nestExecutiveOverviewSections,
} from '../pmoMenuHierarchyUtils'

describe('applyCategorySortOrders (fill missing only — rule 25.1)', () => {
  it('keeps a real DB sort_order', () => {
    const [node] = applyCategorySortOrders([{ menu_code: 'pmo-cat-project-delivery', sort_order: 42 }], 'pmo')
    expect(node.sort_order).toBe(42)
  })

  it('keeps a DB sort_order of 0', () => {
    const [node] = applyCategorySortOrders([{ menu_code: 'pmo-cat-project-delivery', sort_order: 0 }], 'pmo')
    expect(node.sort_order).toBe(0)
  })

  it('fills a missing sort_order from the category order', () => {
    const [node] = applyCategorySortOrders([{ menu_code: 'pmo-cat-project-delivery' }], 'pmo')
    expect(typeof node.sort_order).toBe('number')
  })
})

describe('dissolveExecutiveOverviewCategory (v1000)', () => {
  const exec = (code) => ({
    menu_code: code,
    menu_label: 'Executive Overview',
    children: [{ menu_code: 'pmo_dashboard', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] }],
  })

  it('promotes Dashboard to the PMO root and removes the wrapper', () => {
    const out = dissolveExecutiveOverviewCategory([exec('pmo-cat-exec'), { menu_code: 'pmo-cat-project-delivery', children: [] }], 'pmo')
    expect(out.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(false)
    expect(out.filter((n) => n.menu_label === 'Dashboard')).toHaveLength(1)
  })

  it('does the same for the Simulator practice PMO layout', () => {
    const out = dissolveExecutiveOverviewCategory([exec('sim_pmo_cat_exec')], 'sim_pmo')
    expect(out.some((n) => n.menu_code === 'sim_pmo_cat_exec')).toBe(false)
    expect(out.filter((n) => n.menu_label === 'Dashboard')).toHaveLength(1)
  })

  it('leaves other layouts untouched', () => {
    const nodes = [exec('pmo-cat-exec')]
    expect(dissolveExecutiveOverviewCategory(nodes, 'pm')).toBe(nodes)
  })

  it('keeps nestExecutiveOverviewSections as a deprecated alias', () => {
    const out = nestExecutiveOverviewSections([exec('pmo-cat-exec')], 'pmo')
    expect(out.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(false)
  })
})

describe('menu registry entries (v982 Phase 7 + risk categories)', () => {
  const codes = new Set(MENU_REGISTRY.map((e) => e.menu_code))

  it.each([
    'pmo_configuration_home',
    'pmo_project_classifications',
    'pmo_organisation_authorities',
    'pmo_approval_chains',
    'pmo_roles_responsibilities',
    'pmo_risk_categories',
    'plat_pm_risk_categories',
    'sim_pm_risk_categories',
  ])('includes %s', (code) => {
    expect(codes.has(code)).toBe(true)
  })

  it('files the PMO Configuration items under Administration', () => {
    const entry = MENU_REGISTRY.find((e) => e.menu_code === 'pmo_configuration_home')
    expect(entry.category).toBe('pmo-cat-admin')
  })

  it('still includes entries that only the package had', () => {
    expect(codes.has('plat_pm_manage_roles')).toBe(true)
  })
})

describe('record lifecycle registry (v931/v935 Local Registers)', () => {
  it('registers local_register_records', () => {
    expect(getLifecycleTableConfig('local_register_records')?.label).toBe('Local Registers')
  })
})

describe('applyPmLayoutSanitization organisational templates', () => {
  it('promotes Templates out of Projects to a top-level Organisational Templates row', () => {
    const { universalNodes } = applyPmLayoutSanitization(
      [
        {
          menu_code: 'plat_grp_pm_projects',
          menu_label: 'Projects',
          route_path: null,
          children: [
            { menu_code: 'plat_pm_all_projects', menu_label: 'All Projects', route_path: '/platform/projects', children: [] },
            { menu_code: 'plat_pm_templates', menu_label: 'Templates', route_path: '/platform/templates', children: [] },
          ],
        },
      ],
      []
    )
    const projects = universalNodes.find((n) => n.menu_code === 'plat_grp_pm_projects')
    const orgTemplates = universalNodes.find((n) => n.menu_code === 'plat_pm_templates')
    expect(projects?.children?.some((c) => c.menu_code === 'plat_pm_templates')).toBe(false)
    expect(orgTemplates?.route_path).toBe('/platform/templates')
  })
})
