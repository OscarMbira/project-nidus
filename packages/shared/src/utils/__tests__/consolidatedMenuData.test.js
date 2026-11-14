import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory Supabase stand-in: select / eq / in / not-is-null / order / limit / range / maybeSingle.
const tables = { public: {}, sim: {} }
function query(rows) {
  let list = [...rows]
  let failWith = null
  const q = {
    select: () => q,
    eq: (col, val) => { list = list.filter((r) => r[col] === val); return q },
    in: (col, vals) => { list = list.filter((r) => vals.includes(r[col])); return q },
    not: (col, op, val) => { if (op === 'is' && val === null) list = list.filter((r) => r[col] != null); return q },
    order: () => q,
    limit: () => q,
    range: (from, to) => { list = list.slice(from, to + 1); return q },
    maybeSingle: () => Promise.resolve(failWith ? { data: null, error: failWith } : { data: list[0] || null, error: null }),
    then: (resolve, reject) => Promise.resolve(failWith ? { data: null, error: failWith } : { data: list, error: null }).then(resolve, reject),
    _fail: (e) => { failWith = e; return q },
  }
  return q
}
function db(schema) {
  return {
    from: (name) => {
      const rows = tables[schema][name]
      if (rows === undefined) return query([])._fail({ message: `relation ${name} does not exist` })
      return query(rows)
    },
  }
}
vi.mock('@nidus/supabase', () => ({ platformDb: db('public'), simDb: db('sim') }))

const { isConsolidatedMenuEnabled, buildConsolidatedMenuForUser, clearConsolidatedMenuSwitchCache, loadUserMenuRoles } =
  await import('../consolidatedMenuData.js')

const node = (id, code, label, route = null, children = []) => ({ id, menu_code: code, menu_label: label, route_path: route, children })
const TREE = [
  node('m1', 'plat_pm_dashboard', 'Dashboard', '/platform/dashboard'),
  node('m2', 'plat_pm_risk_reg', 'Risk Register', '/pm/controls/risk-register'),
  node('m3', 'fin_cat_cutover', 'Cutover', null, [node('m4', 'fin_reg_cutover', 'Cutover Plan', '/platform/local-registers/c')]),
  node('m5', 'plat_pm_s_mandate', 'Project Mandate', '/platform/mandates/list'),
]
const PACK_MAP = {
  sections: [{ packId: 'pack-fin', industryCategoryId: 'ind-fin', packName: 'Banking & Financial Services', isPrimary: true }],
  menuCodeToPack: new Map([['fin_reg_cutover', 'pack-fin']]),
}

function seed() {
  tables.public = {
    account_menu_settings: [{ account_id: 'acc-on', consolidated_menu_enabled: true }, { account_id: 'acc-off', consolidated_menu_enabled: false }],
    menu_placement_version: [{ id: 1, version: 7 }],
    menu_sections: [
      { app: 'platform', section_code: 'home', label: 'Home', sort_order: 10, is_active: true },
      { app: 'platform', section_code: 'project_setup', label: 'Project Setup', sort_order: 20, is_active: true },
      { app: 'platform', section_code: 'risks_governance', label: 'Risks, Changes & Governance', sort_order: 60, is_active: true },
      { app: 'platform', section_code: 'readiness_close', label: 'Readiness, Benefits & Close', sort_order: 80, is_active: true },
    ],
    menu_slots: [{ app: 'platform', slot_key: 'cutover', label: 'Cutover', section_code: 'readiness_close', sort_order: 40, is_active: true }],
    menu_item_placements: [
      { menu_item_id: 'm1', placement_key: 'pm', section_code: 'home', sort_order: 10, is_active: true },
      { menu_item_id: 'm2', placement_key: 'pm', section_code: 'risks_governance', sort_order: 10, is_active: true },
      { menu_item_id: 'm3', placement_key: 'pm', section_code: 'readiness_close', slot_key: 'cutover', sort_order: 40, is_active: true },
      { menu_item_id: 'm5', placement_key: 'pm', section_code: 'project_setup', sort_order: 20, is_active: true },
      { menu_item_id: 'm1', placement_key: 'team_member', section_code: 'home', sort_order: 10, is_active: true },
      { menu_item_id: 'm2', placement_key: 'team_member', section_code: 'risks_governance', sort_order: 10, is_active: true },
    ],
    menu_items: [],
    project_industries: [{ project_id: 'prj-1', industry_category_id: 'ind-fin', is_primary: true }],
    project_disabled_menu_items: [],
    projects: [{ id: 'prj-1', industry_category_id: null }, { id: 'prj-2', industry_category_id: null }],
    users: [{ id: 'u1', auth_user_id: 'auth-1' }],
    user_roles: [
      { user_id: 'u1', role_id: 'r-pm', project_id: 'prj-1', is_active: true, is_deleted: false },
      { user_id: 'u1', role_id: 'r-tm', project_id: 'prj-2', is_active: true, is_deleted: false },
    ],
    roles: [{ id: 'r-pm', role_name: 'project_manager' }, { id: 'r-tm', role_name: 'team_member' }],
  }
  tables.sim = {}
}

beforeEach(() => {
  seed()
  sessionStorage.clear()
  clearConsolidatedMenuSwitchCache()
})

describe('isConsolidatedMenuEnabled (D11 / D20)', () => {
  it('reads the organisation switch; off or missing means today’s sidebar', async () => {
    expect(await isConsolidatedMenuEnabled('acc-on')).toBe(true)
    expect(await isConsolidatedMenuEnabled('acc-off')).toBe(false)
    expect(await isConsolidatedMenuEnabled('acc-none')).toBe(false)
    expect(await isConsolidatedMenuEnabled(null)).toBe(false)
  })

  it('is false when the table does not exist yet (SQL not run)', async () => {
    delete tables.public.account_menu_settings
    expect(await isConsolidatedMenuEnabled('acc-on')).toBe(false)
  })

  it('caches the answer for a short time, and force re-reads it', async () => {
    expect(await isConsolidatedMenuEnabled('acc-on')).toBe(true)
    tables.public.account_menu_settings[0].consolidated_menu_enabled = false
    expect(await isConsolidatedMenuEnabled('acc-on')).toBe(true)
    expect(await isConsolidatedMenuEnabled('acc-on', { force: true })).toBe(false)
  })
})

describe('buildConsolidatedMenuForUser', () => {
  const run = (projectId, layout = 'pm') => buildConsolidatedMenuForUser({
    app: 'platform', tree: TREE, accountId: 'acc-on', authUserId: 'auth-1', layout, projectId, packMap: Promise.resolve(PACK_MAP),
  })

  it('PM on a Banking project: sections with the Banking cutover pages', async () => {
    const res = await run('prj-1')
    expect(res.enabled).toBe(true)
    expect(res.placementKey).toBe('pm')
    expect(res.items.map((s) => s.section_code)).toEqual(['home', 'project_setup', 'risks_governance', 'readiness_close'])
    expect(res.pageIndex.map((p) => p.code)).toContain('fin_reg_cutover')
    expect(res.packNames).toEqual([['pack-fin', 'Banking & Financial Services']])
  })

  it('the same user on another project gets the Team Member placements (D26)', async () => {
    const res = await run('prj-2', 'tm')
    expect(res.placementKey).toBe('team_member')
    expect(res.pageIndex.map((p) => p.code)).toEqual(['plat_pm_dashboard', 'plat_pm_risk_reg'])
  })

  it('a project with no industry shows core only (D18)', async () => {
    tables.public.project_industries = []
    const res = await run('prj-1')
    expect(res.pageIndex.map((p) => p.code)).not.toContain('fin_reg_cutover')
  })

  it('switched-off items disappear for the project (D16)', async () => {
    tables.public.project_disabled_menu_items = [{ project_id: 'prj-1', menu_item_id: 'm4' }]
    const res = await run('prj-1')
    expect(res.pageIndex.map((p) => p.code)).not.toContain('fin_reg_cutover')
  })

  it('no project open → Home only (D27)', async () => {
    const res = await run(null)
    expect(res.homeOnly).toBe(true)
    expect(res.items.map((s) => s.section_code)).toEqual(['home'])
  })

  it('caches placements by version: a new version reloads them (R5)', async () => {
    await run('prj-1')
    tables.public.menu_item_placements = tables.public.menu_item_placements.filter((p) => p.menu_item_id !== 'm5')
    expect((await run('prj-1')).pageIndex.map((p) => p.code)).toContain('plat_pm_s_mandate')
    tables.public.menu_placement_version[0].version = 8
    expect((await run('prj-1')).pageIndex.map((p) => p.code)).not.toContain('plat_pm_s_mandate')
  })
})

describe('loadUserMenuRoles (D25)', () => {
  it('falls back to built-in roles when menu_layout_key does not exist yet', async () => {
    const roles = await loadUserMenuRoles('auth-1')
    expect(roles.map((r) => [r.role_name, r.project_id])).toEqual([['project_manager', 'prj-1'], ['team_member', 'prj-2']])
  })
})

describe('consolidated-only catalogue rows (hidden in today’s sidebar)', () => {
  it('a hidden sub-menu parent shows only where a placement puts it, with its placed children', async () => {
    tables.public.menu_items = [{ id: 'm9', menu_code: 'plat_pm_project_settings', menu_label: 'Project Settings', route_path: null, is_visible: false, is_active: true }]
    tables.public.menu_item_placements.push(
      { menu_item_id: 'm9', placement_key: 'pm', section_code: 'project_setup', sort_order: 90, is_active: true },
      { menu_item_id: 'm6', placement_key: 'pm', section_code: 'project_setup', parent_menu_item_id: 'm9', sort_order: 10, is_active: true },
    )
    tables.public.menu_placement_version[0].version = 99
    const tree = [...TREE, node('m6', 'plat_pm_s_regional_format', 'Regional & Format Settings', '/platform/project-setup/regional-format-settings')]
    const res = await buildConsolidatedMenuForUser({
      app: 'platform', tree, accountId: 'acc-on', authUserId: 'auth-1', layout: 'pm', projectId: 'prj-1', packMap: PACK_MAP,
    })
    const setup = res.items.find((s) => s.section_code === 'project_setup')
    const settings = setup.children.find((n) => n.menu_label === 'Project Settings')
    expect(settings.children.map((c) => c.menu_label)).toEqual(['Regional & Format Settings'])
  })
})
