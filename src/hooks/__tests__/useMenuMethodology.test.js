import { describe, it, expect } from 'vitest'
import { resolveVisibleTracks } from '../../config/methodologyMenuUtils'
import { applyRoleSidebarRevamp } from '../useMenu'

describe('useMenu methodology integration', () => {
  it('re-exports resolveVisibleTracks for cascade logic', () => {
    const tracks = resolveVisibleTracks('agile', 'structured', true)
    expect([...tracks].sort()).toEqual(['agile', 'structured'].sort())
  })

  it('hybrid org with structured project shows only that track', () => {
    const tracks = resolveVisibleTracks('hybrid', 'structured', true)
    expect(tracks.size).toBe(1)
    expect(tracks.has('structured')).toBe(true)
  })

  it('DB-first: pmo-cat-governance-standards wrapped under [S] track header', () => {
    // v676+: DB returns category nodes as real rows. applyRoleSidebarRevamp just adds track headers.
    const hierarchy = [
      {
        id: 'cat-gov',
        menu_code: 'pmo-cat-governance-standards',
        menu_label: 'Governance & Standards',
        route_path: null,
        sort_order: 32,
        methodology: 'structured',
        children: [
          {
            id: 'qms',
            menu_code: 'pmo_gov_qms',
            menu_label: 'Quality Management Strategy',
            route_path: '/pmo/governance/qms',
            sort_order: 1,
            children: [],
          },
        ],
      },
      {
        id: 'cat-proj',
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Portfolio & Delivery',
        route_path: null,
        sort_order: 20,
        methodology: 'universal',
        children: [
          {
            id: 'proj1',
            menu_code: 'platform_projects',
            menu_label: 'My Projects',
            route_path: '/platform/projects',
            sort_order: 1,
            children: [],
          },
        ],
      },
    ]
    const tree = applyRoleSidebarRevamp(hierarchy, {
      layout: 'pmo',
      pmProfile: null,
      visibleTracks: ['structured', 'pmbok', 'agile'],
    })
    // Governance category should be wrapped under a [S] Structured methodology header
    const structuredHeader = tree.find(n => n.is_methodology_header && n.methodology_track === 'structured')
    expect(structuredHeader).toBeDefined()
    expect(structuredHeader.children.some(c => c.menu_code === 'pmo-cat-governance-standards')).toBe(true)
    // Project Delivery is universal — rendered at root
    expect(tree.some(n => n.menu_code === 'pmo-cat-project-delivery')).toBe(true)
    // No legacy section headers
    expect(tree.some(n => n.menu_code === 'pmo_section_governance')).toBe(false)
  })

  it('legacy section headers in input are stripped', () => {
    const legacy = [
      { id: 'leg', menu_code: 'pmo_section_initiation', menu_label: 'Business Justification', route_path: null, children: [] },
      {
        id: 'exec',
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        route_path: null,
        sort_order: 10,
        methodology: 'universal',
        children: [
          { id: 'dash', menu_code: 'platform_dashboard', menu_label: 'Dashboard', route_path: '/platform/dashboard', sort_order: 1, children: [] },
        ],
      },
    ]
    const tree = applyRoleSidebarRevamp(legacy, { layout: 'pmo', visibleTracks: ['structured', 'pmbok', 'agile'] })
    expect(tree.some(n => n.menu_code === 'pmo_section_initiation')).toBe(false)
    expect(tree.some(n => n.menu_code === 'pmo-cat-exec')).toBe(true)
  })

  it('does not empty the tree when applyRoleSidebarRevamp runs twice (regression)', () => {
    const hierarchy = [
      {
        id: 'cat-gov',
        menu_code: 'pmo-cat-governance-standards',
        menu_label: 'Governance & Standards',
        route_path: null,
        sort_order: 32,
        methodology: 'structured',
        children: [
          {
            id: 'qms',
            menu_code: 'pmo_gov_qms',
            menu_label: 'Quality Management Strategy',
            route_path: '/pmo/governance/qms',
            sort_order: 1,
            children: [],
          },
        ],
      },
      {
        id: 'cat-proj',
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Portfolio & Delivery',
        route_path: null,
        sort_order: 20,
        methodology: 'universal',
        children: [
          {
            id: 'proj1',
            menu_code: 'platform_projects',
            menu_label: 'My Projects',
            route_path: '/platform/projects',
            sort_order: 1,
            children: [],
          },
        ],
      },
    ]
    const hint = { layout: 'pmo', visibleTracks: ['structured', 'pmbok', 'agile'] }
    const once = applyRoleSidebarRevamp(hierarchy, hint)
    const twice = applyRoleSidebarRevamp(once, hint)
    expect(once.length).toBeGreaterThan(0)
    expect(twice.length).toBeGreaterThan(0)
    expect(twice.some((n) => n.menu_code === 'pmo-cat-project-delivery' || n.is_methodology_header)).toBe(true)
  })

  it('PM layout places methodology tracks before Reporting & Intelligence', () => {
    const hierarchy = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        sort_order: 500,
        children: [{ menu_code: 'dash', menu_label: 'Dashboard', route_path: '/pm/dashboard', children: [] }],
      },
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Portfolio & Delivery',
        sort_order: 600,
        children: [],
      },
      {
        menu_code: 'pmo-cat-reporting-intelligence',
        menu_label: 'Reporting & Intelligence',
        sort_order: 50,
        children: [],
      },
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Pre-Project Docs',
        sort_order: 700,
        children: [{ menu_code: 'mandates', menu_label: 'Mandates', route_path: '/platform/mandates', children: [] }],
      },
    ]
    const tree = applyRoleSidebarRevamp(hierarchy, {
      layout: 'pm',
      pmProfile: 'executive',
      visibleTracks: ['structured', 'pmbok', 'agile'],
    })
    const labels = tree.map((n) => n.menu_label)
    const reportingIdx = labels.indexOf('Reporting & Intelligence')
    const structIdx = labels.findIndex((l) => /PRINCE2|Structured/.test(l))
    expect(reportingIdx).toBeGreaterThan(-1)
    expect(structIdx).toBeGreaterThan(-1)
    expect(structIdx).toBeLessThan(reportingIdx)
  })

  it('PMO layout places methodology tracks after Portfolio & Delivery (not first)', () => {
    const hierarchy = [
      {
        menu_code: 'pmo-cat-exec',
        menu_label: 'Executive Overview',
        sort_order: 500,
        children: [{ menu_code: 'dash', menu_label: 'Dashboard', route_path: '/platform/dashboard', children: [] }],
      },
      {
        menu_code: 'pmo-cat-project-delivery',
        menu_label: 'Portfolio & Delivery',
        sort_order: 600,
        children: [],
      },
      {
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Pre-Project Docs',
        sort_order: 700,
        methodology: 'structured',
        children: [{ menu_code: 'mandates', menu_label: 'Mandates', route_path: '/platform/mandates', children: [] }],
      },
    ]
    const tree = applyRoleSidebarRevamp(hierarchy, {
      layout: 'pmo',
      visibleTracks: ['structured', 'pmbok', 'agile'],
    })
    const labels = tree.map((n) => n.menu_label)
    expect(labels[0]).toBe('Executive Overview')
    expect(labels[1]).toBe('Portfolio & Delivery')
    expect(labels[2]).toMatch(/PRINCE2/)
  })

  it('PMO layout buckets flat orphan roots under category sections', () => {
    const flatOrphans = [
      { menu_code: 'security', menu_label: 'Security', sort_order: 1, children: [] },
      { menu_code: 'users', menu_label: 'Users', sort_order: 2, children: [] },
      {
        menu_code: 'pmo_dashboard',
        menu_label: 'Dashboard',
        route_path: '/platform/dashboard',
        sort_order: 3,
        children: [],
      },
    ]
    const tree = applyRoleSidebarRevamp(flatOrphans, {
      layout: 'pmo',
      visibleTracks: ['structured', 'pmbok', 'agile'],
    })
    expect(tree.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(true)
    expect(tree.some((n) => n.menu_code === 'pmo-cat-system-admin')).toBe(true)
    expect(tree.find((n) => n.menu_label === 'Security')).toBeUndefined()
  })

  it('TM layout returns hierarchy as-is without methodology wrapping', () => {
    const hierarchy = [
      { id: 'task', menu_code: 'tm_my_tasks', menu_label: 'My Tasks', route_path: '/platform/tasks/mine', sort_order: 1, children: [] },
    ]
    const tree = applyRoleSidebarRevamp(hierarchy, { layout: 'tm', visibleTracks: ['structured', 'pmbok', 'agile'] })
    expect(tree).toHaveLength(1)
    expect(tree[0].menu_code).toBe('tm_my_tasks')
    expect(tree.some(n => n.is_methodology_header)).toBe(false)
  })
})
