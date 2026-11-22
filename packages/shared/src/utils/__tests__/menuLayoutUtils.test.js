import { describe, it, expect, beforeEach } from 'vitest'
import {
  cacheUserMenuRoles,
  clearCachedUserMenuRoles,
  clearPersistedMenuLayoutScope,
  inferLayoutScopeFromPathname,
  persistMenuLayoutScope,
  resolveLayoutType,
  resolveMenuLayoutScope,
  shouldUsePmLayoutShell,
  isPmoOnlyPlatformPath,
  isSharedPmPlatformPath,
  isPmLayoutPath,
  PM_LAYOUT_ROLES,
  resolvePrimaryLayoutScopeFromRoles,
} from '../menuLayoutUtils'

describe('inferLayoutScopeFromPathname', () => {
  it('maps PM routes to pm scope', () => {
    expect(inferLayoutScopeFromPathname('/pm/dashboard')).toBe('pm')
    expect(inferLayoutScopeFromPathname('/pm/projects/abc/tasks')).toBe('pm')
  })

  it('maps platform routes to pmo scope', () => {
    expect(inferLayoutScopeFromPathname('/platform/dashboard')).toBe('pmo')
    expect(inferLayoutScopeFromPathname('/app/project-members')).toBe('pmo')
  })

  it('does not confuse /pm with /pmo', () => {
    expect(inferLayoutScopeFromPathname('/pmo/settings')).toBe('pmo')
    expect(inferLayoutScopeFromPathname('/pm/dashboard')).toBe('pm')
  })

  it('keeps the PMO sidebar on PMO Configuration area pages in both apps (v1292)', () => {
    expect(inferLayoutScopeFromPathname('/platform/pmo-admin/configuration/areas/risk_categories/edit')).toBe('pmo')
    expect(inferLayoutScopeFromPathname('/simulator/pmo/configuration/areas/create')).toBe('pmo')
    expect(isPmoOnlyPlatformPath('/platform/pmo-admin/configuration/areas/PCA-0001')).toBe(true)
  })
})

describe('resolveLayoutType', () => {
  it('defaults dual-role users to PMO layout without preference', () => {
    const result = resolveLayoutType(['pmo_admin', 'project_manager'])
    expect(result.layout).toBe('pmo')
  })

  it('uses PM layout on /pm routes for dual-role users', () => {
    const result = resolveLayoutType(['pmo_admin', 'project_manager'], { layoutPreference: 'pm' })
    expect(result.layout).toBe('pm')
  })

  it('forces PM layout when layoutPreference is pm even without PM role names', () => {
    const result = resolveLayoutType(['pmo_admin'], { layoutPreference: 'pm' })
    expect(result.layout).toBe('pm')
  })

  it('uses PMO layout on platform routes for dual-role users', () => {
    const result = resolveLayoutType(['pmo_admin', 'project_manager'], { layoutPreference: 'pmo' })
    expect(result.layout).toBe('pmo')
  })

  it('uses PM layout for project_manager only', () => {
    const result = resolveLayoutType(['project_manager'])
    expect(result.layout).toBe('pm')
  })
})

describe('resolveMenuLayoutScope', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    clearPersistedMenuLayoutScope()
    clearCachedUserMenuRoles()
  })

  it('persists and returns explicit pm layout from PMLayout', () => {
    expect(resolveMenuLayoutScope('pm', '/platform/projects')).toBe('pm')
    expect(sessionStorage.getItem('nidus_menu_layout_scope')).toBe('pm')
  })

  it('keeps PM sidebar on shared platform routes after PM login', () => {
    persistMenuLayoutScope('pm')
    expect(resolveMenuLayoutScope(null, '/platform/projects')).toBe('pm')
    expect(resolveMenuLayoutScope(null, '/platform/tasks')).toBe('pm')
  })

  it('defaults shared platform delivery routes to PM sidebar for PM-only users', () => {
    expect(resolveMenuLayoutScope(null, '/platform/projects', ['project_manager'])).toBe('pm')
    expect(resolveMenuLayoutScope(null, '/platform/projects')).toBe('pm')
  })

  it('honours persisted PMO context for dual-role users on shared routes', () => {
    persistMenuLayoutScope('pmo')
    expect(resolveMenuLayoutScope(null, '/platform/projects', ['pmo_admin', 'project_manager'])).toBe('pmo')
  })

  it('switches to PMO sidebar on PMO-only platform routes', () => {
    persistMenuLayoutScope('pm')
    expect(resolveMenuLayoutScope(null, '/platform/portfolio')).toBe('pmo')
  })

  it('keeps PM sidebar for manager tiers on Manage Roles', () => {
    persistMenuLayoutScope('pm')
    expect(resolveMenuLayoutScope(null, '/platform/admin/manage-roles', ['project_manager'])).toBe('pm')
    expect(resolveMenuLayoutScope(null, '/platform/admin/manage-roles', ['team_manager'])).toBe('pm')
    expect(shouldUsePmLayoutShell('/platform/admin/manage-roles', ['programme_manager'])).toBe(true)
  })

  it('keeps PMO sidebar for PMO Admin on Manage Roles', () => {
    cacheUserMenuRoles('user-1', ['pmo_admin'])
    expect(resolveMenuLayoutScope(null, '/platform/admin/manage-roles')).toBe('pmo')
    expect(shouldUsePmLayoutShell('/platform/admin/manage-roles')).toBe(false)
  })

  it('uses cached PMO roles so Layout does not force PM shell for org admins', () => {
    cacheUserMenuRoles('user-1', ['pmo_admin'])
    expect(resolveMenuLayoutScope(null, '/platform/projects/all')).toBe('pmo')
    expect(shouldUsePmLayoutShell('/platform/projects/ADMSEED-PRJ-01')).toBe(false)
  })
})

describe('isSharedPmPlatformPath (v1477 Mandate/Brief Approvals)', () => {
  it('keeps Project Mandate / Brief list paths as shared PM', () => {
    expect(isSharedPmPlatformPath('/platform/mandates/list')).toBe(true)
    expect(isSharedPmPlatformPath('/platform/brief')).toBe(true)
  })

  it('does not treat /platform/briefs/* as /platform/brief', () => {
    expect(isSharedPmPlatformPath('/platform/briefs/approvals')).toBe(false)
    expect(isSharedPmPlatformPath('/platform/briefs/list')).toBe(false)
  })

  it('excludes Mandate / Brief approval hubs from the PM shell', () => {
    expect(isSharedPmPlatformPath('/platform/mandates/approvals')).toBe(false)
    expect(isPmLayoutPath('/platform/mandates/approvals')).toBe(false)
    expect(isPmLayoutPath('/platform/briefs/approvals')).toBe(false)
  })
})

describe('Project Administrator layout (v1343, PRD A9)', () => {
  it('a Project Administrator gets the PM shell, not the PMO shell', () => {
    expect(PM_LAYOUT_ROLES.has('project_administrator')).toBe(true)
    expect(resolvePrimaryLayoutScopeFromRoles(['project_administrator'])).toBe('pm')
    expect(resolvePrimaryLayoutScopeFromRoles(['Project Administrator'])).toBe('pm')
  })
})
