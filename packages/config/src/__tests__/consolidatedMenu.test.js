import { describe, it, expect } from 'vitest'
import { buildConsolidatedMenu, resolvePlacementKey, flattenConsolidatedPages, findSlotTabsForRoute, searchConsolidatedPages } from '../consolidatedMenu.js'

// ── Fixtures ────────────────────────────────────────────────────────────────
const SECTIONS = [
  { section_code: 'home', label: 'Home', icon: 'home', sort_order: 10 },
  { section_code: 'project_setup', label: 'Project Setup', sort_order: 20, overflow_label: 'Industry setup' },
  { section_code: 'scope_requirements', label: 'Scope & Requirements', sort_order: 30 },
  { section_code: 'deliver_test', label: 'Deliver & Test', sort_order: 50, overflow_label: 'Industry delivery' },
  { section_code: 'risks_governance', label: 'Risks, Changes & Governance', sort_order: 60 },
  { section_code: 'readiness_close', label: 'Readiness, Benefits & Close', sort_order: 80 },
  { section_code: 'footer', label: 'Reports & Documents', sort_order: 100, is_footer: true },
]
const SLOTS = [
  { slot_key: 'interfaces', label: 'Interfaces', section_code: 'scope_requirements', sort_order: 70 },
  { slot_key: 'cutover', label: 'Cutover', section_code: 'readiness_close', sort_order: 40 },
  { slot_key: 'testing', label: 'Testing', section_code: 'deliver_test', sort_order: 70 },
]
const node = (menu_code, menu_label, route_path = null, children = []) => ({ id: `id-${menu_code}`, menu_code, menu_label, route_path, children })

// Presentation tree as useMenu builds it (categories, core leaves, industry groups with registers).
const TREE = [
  node('plat_pm_dashboard', 'Dashboard', '/platform/dashboard'),
  node('plat_pm_project_setup', 'Project Setup', null, [
    node('plat_pm_s_project_details', 'Project Details', '/platform/project-details'),
    node('plat_pm_project_team', 'Project Team', null, [
      node('plat_pm_pt_members', 'Team Members', '/platform/teams'),
    ]),
    node('plat_pm_project_settings', 'Project Settings', null),
    node('plat_pm_s_regional_format', 'Regional & Format Settings', '/platform/project-setup/regional-format-settings'),
  ]),
  node('plat_pm_raid', 'RAID', null, [
    node('plat_pm_risk_reg', 'Risk Register', '/pm/controls/risk-register'),
    node('plat_pm_issue_log', 'Issue Register', '/pm/controls/issue-register'),
  ]),
  node('plat_pm_testing_plan', 'Test Planning', '/platform/testing'),
  node('plat_pm_rep_library', 'Report Library', '/platform/reports'),
  node('fin_cat_cutover', 'Cutover', null, [node('fin_reg_cutover_plan', 'Cutover Plan', '/platform/local-registers/fin-cutover')]),
  node('fin_cat_core_banking', 'Core Banking', null, [
    node('fin_reg_interfaces', 'Interfaces', '/platform/local-registers/fin-interfaces'),
    node('fin_reg_products', 'Products', '/platform/local-registers/fin-products'),
  ]),
  node('ict_cat_interfaces', 'Interfaces', null, [node('ict_reg_interfaces', 'Interface Catalogue', '/platform/local-registers/ict-interfaces')]),
  node('enr_cat_outages_cutovers', 'Outages & Cutovers', null, [node('enr_reg_outages', 'Outage Plan', '/platform/local-registers/enr-outages')]),
  node('fin_cat_testing_assurance', 'Testing & Assurance', null, [node('fin_reg_uat', 'UAT', '/platform/local-registers/fin-uat')]),
]

const PACK_OF = new Map([
  ['fin_reg_cutover_plan', 'pack-fin'], ['fin_reg_interfaces', 'pack-fin'], ['fin_reg_products', 'pack-fin'],
  ['fin_reg_uat', 'pack-fin'], ['ict_reg_interfaces', 'pack-ict'], ['enr_reg_outages', 'pack-enr'],
])

const P = (menu_code, section_code, sort_order, extra = {}) => ({ menu_code, section_code, sort_order, ...extra })
const PLACEMENTS = [
  P('plat_pm_dashboard', 'home', 10),
  P('plat_pm_s_project_details', 'project_setup', 10),
  P('plat_pm_project_team', 'project_setup', 70),
  P('plat_pm_project_settings', 'project_setup', 90),
  P('plat_pm_s_regional_format', 'project_setup', 10, { parent_code: 'plat_pm_project_settings' }),
  P('plat_pm_risk_reg', 'risks_governance', 10),
  P('plat_pm_issue_log', 'risks_governance', 20),
  P('plat_pm_testing_plan', 'deliver_test', 70, { slot_key: 'testing' }),
  P('fin_cat_testing_assurance', 'deliver_test', 71, { slot_key: 'testing' }),
  P('plat_pm_rep_library', 'footer', 10),
  P('fin_cat_cutover', 'readiness_close', 40, { slot_key: 'cutover' }),
  P('enr_cat_outages_cutovers', 'readiness_close', 41, { slot_key: 'cutover' }),
  P('fin_reg_interfaces', 'scope_requirements', 70, { slot_key: 'interfaces' }),
  P('ict_reg_interfaces', 'scope_requirements', 71, { slot_key: 'interfaces' }),
  P('fin_cat_core_banking', 'scope_requirements', 50),
]

function build(overrides = {}) {
  return buildConsolidatedMenu({
    tree: TREE,
    sections: SECTIONS,
    slots: SLOTS,
    placements: PLACEMENTS,
    defaultSectionByCode: new Map(),
    packOfCode: PACK_OF,
    allowedPackIds: ['pack-fin'],
    disabledCodes: new Set(),
    ...overrides,
  })
}
const sectionCodes = (res) => res.items.map((s) => s.section_code)
const section = (res, code) => res.items.find((s) => s.section_code === code)
const labels = (nodes) => (nodes || []).map((n) => n.menu_label)
const allCodes = (nodes) => (nodes || []).flatMap((n) => [n.menu_code, ...allCodes(n.children)])

// ── Engine ──────────────────────────────────────────────────────────────────
describe('buildConsolidatedMenu (v1341)', () => {
  it('builds sections in order, footer last, with no Core or industry blocks', () => {
    const res = build()
    expect(sectionCodes(res)).toEqual(['home', 'project_setup', 'scope_requirements', 'deliver_test', 'risks_governance', 'readiness_close', 'footer'])
    expect(section(res, 'footer').isFooter).toBe(true)
    expect(allCodes(res.items).some((c) => String(c).startsWith('synthetic-'))).toBe(false)
  })

  it('single-industry project: Banking items show, other packs do not', () => {
    const codes = allCodes(build().items)
    expect(codes).toContain('fin_reg_cutover_plan')
    expect(codes).not.toContain('enr_reg_outages')
    expect(codes).not.toContain('ict_reg_interfaces')
  })

  it('project with no industry (or outside a project) shows core only (D3, D18)', () => {
    const codes = allCodes(build({ allowedPackIds: [] }).items)
    expect(codes.some((c) => /^(fin|ict|enr)_/.test(c))).toBe(false)
    expect(codes).toContain('plat_pm_risk_reg')
  })

  it('single-member slot keeps the member and its own label, with no tab strip', () => {
    const res = build()
    const scope = section(res, 'scope_requirements')
    expect(labels(scope.children)).toContain('Interfaces')
    const entry = scope.children.find((n) => n.menu_label === 'Interfaces')
    expect(entry.menu_code).toBe('fin_reg_interfaces')
    expect(res.slotTabs.find((s) => s.slotKey === 'interfaces')).toBeUndefined()
  })

  it('composite FIN ★ + ICT: one Interfaces entry, primary member first, tab strip for both', () => {
    const res = build({ allowedPackIds: ['pack-fin', 'pack-ict'] })
    const scope = section(res, 'scope_requirements')
    const entries = scope.children.filter((n) => n.menu_label === 'Interfaces')
    expect(entries).toHaveLength(1)
    expect(entries[0].route_path).toBe('/platform/local-registers/fin-interfaces')
    const strip = res.slotTabs.find((s) => s.slotKey === 'interfaces')
    expect(strip.tabs.map((t) => t.route)).toEqual(['/platform/local-registers/fin-interfaces', '/platform/local-registers/ict-interfaces'])
  })

  it('primary industry leads: ICT ★ + FIN puts the ICT member first', () => {
    const res = build({ allowedPackIds: ['pack-ict', 'pack-fin'] })
    const strip = res.slotTabs.find((s) => s.slotKey === 'interfaces')
    expect(strip.tabs[0].route).toBe('/platform/local-registers/ict-interfaces')
  })

  it('slot of group members becomes one sub-menu with the members’ pages, core first', () => {
    const res = build({ allowedPackIds: ['pack-fin', 'pack-enr'] })
    const ready = section(res, 'readiness_close')
    const cut = ready.children.filter((n) => n.menu_label === 'Cutover')
    expect(cut).toHaveLength(1)
    expect(labels(cut[0].children)).toEqual(['Cutover Plan', 'Outage Plan'])
    const testing = section(res, 'deliver_test').children.find((n) => n.menu_label === 'Testing')
    expect(labels(testing.children)).toEqual(['Test Planning', 'UAT'])
  })

  it('Level 3 sub-menus: placed parents carry their children; parent placement nests an item', () => {
    const setup = section(build(), 'project_setup')
    const team = setup.children.find((n) => n.menu_label === 'Project Team')
    expect(labels(team.children)).toEqual(['Team Members'])
    const settings = setup.children.find((n) => n.menu_label === 'Project Settings')
    expect(labels(settings.children)).toEqual(['Regional & Format Settings'])
    expect(labels(setup.children)).not.toContain('Regional & Format Settings')
  })

  it('an industry group placed directly carries only its allowed registers', () => {
    const scope = section(build(), 'scope_requirements')
    const banking = scope.children.find((n) => n.menu_label === 'Core Banking')
    expect(labels(banking.children)).toEqual(['Products'])
  })

  it('hides empty sections', () => {
    const res = build({ placements: PLACEMENTS.filter((p) => p.section_code !== 'risks_governance') , tree: TREE.filter((n) => n.menu_code !== 'plat_pm_raid') })
    expect(sectionCodes(res)).not.toContain('risks_governance')
  })

  it('missing placement falls back to the nearest default section, otherwise is reported', () => {
    const tree = [...TREE, node('plat_pm_new_page', 'New Page', '/platform/new'), node('plat_pm_orphan', 'Orphan', '/platform/orphan')]
    const res = build({ tree, defaultSectionByCode: new Map([['plat_pm_new_page', 'deliver_test']]) })
    expect(labels(section(res, 'deliver_test').children)).toContain('New Page')
    expect(res.unplaced).toContain('plat_pm_orphan')
    expect(allCodes(res.items)).not.toContain('plat_pm_orphan')
  })

  it('unplaced children inherit an ancestor’s default section', () => {
    const tree = [...TREE, node('plat_pm_quality', 'Quality', null, [node('plat_pm_quality_plan', 'Quality Plan', '/platform/qms')])]
    const res = build({ tree, defaultSectionByCode: new Map([['plat_pm_quality', 'deliver_test']]) })
    expect(allCodes(section(res, 'deliver_test').children)).toContain('plat_pm_quality_plan')
  })

  it('switched-off items are hidden (D16)', () => {
    const res = build({ disabledCodes: new Set(['fin_reg_cutover_plan']) })
    expect(allCodes(res.items)).not.toContain('fin_reg_cutover_plan')
    expect(res.pageIndex.map((p) => p.code)).not.toContain('fin_reg_cutover_plan')
  })

  it('section over the limit groups its industry entries under one entry (D14); slots count as one', () => {
    const extraTree = [...TREE]
    const extraPlacements = [...PLACEMENTS]
    for (let i = 0; i < 11; i += 1) {
      extraTree.push(node(`plat_pm_core_${i}`, `Core ${i}`, `/platform/core-${i}`))
      extraPlacements.push(P(`plat_pm_core_${i}`, 'deliver_test', 100 + i))
    }
    extraTree.push(node('fin_cat_payments', 'Payments & Channels', null, [node('fin_reg_payments', 'Payments', '/platform/local-registers/fin-pay')]))
    PACK_OF.set('fin_reg_payments', 'pack-fin')
    extraPlacements.push(P('fin_cat_payments', 'deliver_test', 200))
    extraTree.push(node('fin_cat_channels', 'Digital Channels', null, [node('fin_reg_channels', 'Channels', '/platform/local-registers/fin-ch')]))
    PACK_OF.set('fin_reg_channels', 'pack-fin')
    extraPlacements.push(P('fin_cat_channels', 'deliver_test', 201))
    const res = build({ tree: extraTree, placements: extraPlacements })
    const deliver = section(res, 'deliver_test')
    expect(deliver.children.length).toBe(13) // 11 core + Testing slot + one industry group
    const group = deliver.children.find((n) => n.menu_label === 'Industry delivery')
    expect(allCodes(group.children)).toEqual(expect.arrayContaining(['fin_reg_payments', 'fin_reg_channels']))
    expect(labels(deliver.children)).toContain('Core 10')
    expect(labels(deliver.children)).toContain('Testing')
    PACK_OF.delete('fin_reg_payments')
    PACK_OF.delete('fin_reg_channels')
  })

  it('no limit on industries: five packs still give one entry per shared slot', () => {
    const res = build({ allowedPackIds: ['pack-fin', 'pack-ict', 'pack-enr', 'pack-x', 'pack-y'] })
    expect(section(res, 'readiness_close').children.filter((n) => n.menu_label === 'Cutover')).toHaveLength(1)
    expect(section(res, 'scope_requirements').children.filter((n) => n.menu_label === 'Interfaces')).toHaveLength(1)
  })

  it('home-only mode shows just the Home section (D27)', () => {
    expect(sectionCodes(build({ homeOnly: true }))).toEqual(['home'])
  })

  it('organisation-scope placements show with organisation industries, not project ones (D28)', () => {
    const tree = [...TREE, node('fin_cat_library', 'Banking Library', null, [node('fin_reg_library', 'Product Catalogue', '/platform/local-registers/fin-lib')])]
    PACK_OF.set('fin_reg_library', 'pack-fin')
    const placements = [...PLACEMENTS, P('fin_cat_library', 'project_setup', 300, { scope: 'organisation' })]
    const inProject = build({ tree, placements, allowedPackIds: [], organisationPackIds: ['pack-fin'], includeOrganisationScope: false })
    expect(allCodes(inProject.items)).not.toContain('fin_reg_library')
    const pmo = build({ tree, placements, allowedPackIds: [], organisationPackIds: ['pack-fin'], includeOrganisationScope: true })
    expect(allCodes(pmo.items)).toContain('fin_reg_library')
    PACK_OF.delete('fin_reg_library')
  })

  it('page index lists exactly the visible pages with section and industry (D22)', () => {
    const res = build()
    const codes = res.pageIndex.map((p) => p.code)
    expect(codes).toContain('plat_pm_risk_reg')
    expect(codes).toContain('fin_reg_cutover_plan')
    expect(codes).not.toContain('enr_reg_outages')
    const cut = res.pageIndex.find((p) => p.code === 'fin_reg_cutover_plan')
    expect(cut).toMatchObject({ route: '/platform/local-registers/fin-cutover', section: 'Readiness, Benefits & Close', packId: 'pack-fin' })
    expect(flattenConsolidatedPages(res.items).length).toBe(res.pageIndex.length)
  })
})

// ── Placement key resolver ──────────────────────────────────────────────────
describe('resolvePlacementKey (D25, D26, D27)', () => {
  it('maps built-in roles by layout', () => {
    expect(resolvePlacementKey({ layout: 'pm', roles: [{ role_name: 'project_manager' }], projectOpen: true }).key).toBe('pm')
    expect(resolvePlacementKey({ layout: 'pm', roles: [{ role_name: 'team_manager' }], projectOpen: true }).key).toBe('team')
    expect(resolvePlacementKey({ layout: 'tm', roles: [{ role_name: 'team_lead' }], projectOpen: true }).key).toBe('team')
    expect(resolvePlacementKey({ layout: 'tm', roles: [{ role_name: 'team_member' }], projectOpen: true }).key).toBe('team_member')
    expect(resolvePlacementKey({ layout: 'pm', roles: [{ role_name: 'project_sponsor' }], projectOpen: true }).key).toBe('sponsor')
    expect(resolvePlacementKey({ layout: 'pmo', roles: [{ role_name: 'pmo_admin' }] }).key).toBe('pmo_oversight')
  })

  it('uses the role on the open project when the user has project-specific roles (D26)', () => {
    const roles = [
      { role_name: 'project_manager', project_id: 'A' },
      { role_name: 'team_member', project_id: 'B' },
    ]
    expect(resolvePlacementKey({ layout: 'pm', roles, projectId: 'A', projectOpen: true }).key).toBe('pm')
    expect(resolvePlacementKey({ layout: 'tm', roles, projectId: 'B', projectOpen: true }).key).toBe('team_member')
  })

  it('picks the widest key when several roles apply', () => {
    const roles = [{ role_name: 'team_manager' }, { role_name: 'project_manager' }, { role_name: 'viewer' }]
    expect(resolvePlacementKey({ layout: 'pm', roles, projectOpen: true }).key).toBe('pm')
  })

  it('custom role uses its "menu based on" layout (D25)', () => {
    const roles = [{ role_name: 'bank_cutover_lead', account_id: 'acc', menu_layout_key: 'team' }]
    expect(resolvePlacementKey({ layout: 'pm', roles, projectOpen: true }).key).toBe('team')
  })

  it('project-scoped key with no project open → Home only (D27); organisation keys are not', () => {
    expect(resolvePlacementKey({ layout: 'pm', roles: [{ role_name: 'project_manager' }], projectOpen: false })).toMatchObject({ key: 'pm', homeOnly: true })
    expect(resolvePlacementKey({ layout: 'pm', roles: [{ role_name: 'portfolio_manager' }], projectOpen: false })).toMatchObject({ key: 'portfolio', homeOnly: false })
    expect(resolvePlacementKey({ layout: 'pmo', roles: [{ role_name: 'pmo_admin' }], projectOpen: false }).homeOnly).toBe(false)
  })
})

// ── Helpers: slot tab strip lookup (D23) and Go to page (D22) ───────────────

describe('findSlotTabsForRoute (D23)', () => {
  const strips = [{ slotKey: 'interfaces', label: 'Interfaces', tabs: [
    { code: 'a', label: 'Banking', route: '/platform/local-registers/fin-interfaces' },
    { code: 'b', label: 'IT', route: '/platform/local-registers/ict-interfaces' },
  ] }]
  it('finds the strip for a member route, including sub-paths and query strings', () => {
    expect(findSlotTabsForRoute(strips, '/platform/local-registers/ict-interfaces').activeRoute).toBe('/platform/local-registers/ict-interfaces')
    expect(findSlotTabsForRoute(strips, '/platform/local-registers/fin-interfaces/new?x=1').slotKey).toBe('interfaces')
  })
  it('returns null for routes outside any slot', () => {
    expect(findSlotTabsForRoute(strips, '/platform/dashboard')).toBeNull()
    expect(findSlotTabsForRoute(strips, '/platform/local-registers/fin')).toBeNull()
  })
})

describe('searchConsolidatedPages (D22)', () => {
  const index = [
    { code: 'r', label: 'Risk Register', route: '/r', section: 'Risks, Changes & Governance', packId: null },
    { code: 'c', label: 'Cutover Plan', route: '/c', section: 'Readiness, Benefits & Close', packId: 'pack-fin' },
  ]
  const names = new Map([['pack-fin', 'Banking & Financial Services']])
  it('matches label, section and industry name, showing the industry', () => {
    expect(searchConsolidatedPages(index, 'risk', names).map((p) => p.code)).toEqual(['r'])
    const hit = searchConsolidatedPages(index, 'banking', names)
    expect(hit).toHaveLength(1)
    expect(hit[0]).toMatchObject({ code: 'c', industry: 'Banking & Financial Services' })
  })
  it('returns nothing for an empty query', () => {
    expect(searchConsolidatedPages(index, '  ', names)).toEqual([])
  })
})

describe('findSlotTabsForRoute with route placeholders', () => {
  it('matches :projectId segments', () => {
    const strips = [{ slotKey: 'x', label: 'X', tabs: [
      { code: 'a', label: 'A', route: '/platform/projects/:projectId/closure' },
      { code: 'b', label: 'B', route: '/platform/b' },
    ] }]
    expect(findSlotTabsForRoute(strips, '/platform/projects/PRJ-1/closure').activeRoute).toBe('/platform/projects/:projectId/closure')
    expect(findSlotTabsForRoute(strips, '/platform/projects/PRJ-1/other')).toBeNull()
  })
})

describe('duplicate catalogue pages', () => {
  it('keeps one entry per route within a section', () => {
    const tree = [node('a', 'PID', '/pm/initiation/pid'), node('b', 'PIDs', '/pm/initiation/pid')]
    const res = buildConsolidatedMenu({
      tree,
      sections: [{ section_code: 'project_setup', label: 'Project Setup', sort_order: 1 }],
      placements: [P('a', 'project_setup', 1), P('b', 'project_setup', 2)],
    })
    expect(res.items[0].children.map((n) => n.menu_code)).toEqual(['a'])
  })
})

describe('compact menus (Team Member, governance profiles)', () => {
  it('useDefaults: false shows only placed items, never a defaulted category', () => {
    const tree = [node('plat_pm_project_setup', 'Project Setup', null, [
      node('plat_pm_pt_contacts', 'Contact Directory', '/platform/project-contacts'),
      node('plat_pm_s_mandate', 'Project Mandate', '/platform/mandates/list'),
    ])]
    const args = {
      tree,
      sections: [{ section_code: 'project_setup', label: 'Project Setup', sort_order: 1 }],
      placements: [P('plat_pm_pt_contacts', 'project_setup', 10)],
      defaultSectionByCode: new Map([['plat_pm_project_setup', 'project_setup']]),
    }
    const full = buildConsolidatedMenu(args)
    expect(allCodes(full.items)).toContain('plat_pm_s_mandate')
    const compact = buildConsolidatedMenu({ ...args, useDefaults: false })
    expect(allCodes(compact.items)).toContain('plat_pm_pt_contacts')
    expect(allCodes(compact.items)).not.toContain('plat_pm_s_mandate')
  })
})
