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
