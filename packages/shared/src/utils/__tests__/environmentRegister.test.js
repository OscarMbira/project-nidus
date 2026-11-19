import { describe, it, expect } from 'vitest'
import {
  CORE_ENVIRONMENTS_REGISTER_ID,
  environmentFromRecord,
  sortEnvironments,
  environmentsRegisterPath,
  environmentsRedirectPath,
} from '../environmentRegister'

const rec = (over = {}) => ({
  id: 'env-1', record_project_id: 'p1', title: 'UAT', description: 'Business testing', status: 'ready',
  created_at: '2026-01-01', updated_at: '2026-01-02', created_by: 'u1', updated_by: 'u2', ...over,
})

describe('environmentRegister (v1342)', () => {
  it('uses the core register id from SQL v1467', () => {
    expect(CORE_ENVIRONMENTS_REGISTER_ID).toBe('00000000-0000-4000-9100-000000000002')
  })

  it('maps a register record to the shape test suites and runs use (same id)', () => {
    expect(environmentFromRecord(rec())).toEqual({
      id: 'env-1', project_id: 'p1', name: 'UAT', description: 'Business testing', status: 'ready', is_active: true,
      created_at: '2026-01-01', updated_at: '2026-01-02', created_by: 'u1', updated_by: 'u2',
    })
  })

  it('Decommissioned is inactive; the Simulator shape uses practice_project_id', () => {
    const env = environmentFromRecord(rec({ status: 'decommissioned', description: null }), 'practice_project_id')
    expect(env.is_active).toBe(false)
    expect(env.practice_project_id).toBe('p1')
    expect(env.project_id).toBeUndefined()
    expect(env.description).toBeNull()
  })

  it('sorts by name (ignoring case), then oldest first', () => {
    const rows = [
      { name: 'uat', created_at: '2026-02-01' },
      { name: 'Dev', created_at: '2026-03-01' },
      { name: 'UAT', created_at: '2026-01-01' },
    ]
    expect(sortEnvironments(rows).map((r) => `${r.name}@${r.created_at}`)).toEqual(['Dev@2026-03-01', 'UAT@2026-01-01', 'uat@2026-02-01'])
  })

  it('register list address per app', () => {
    expect(environmentsRegisterPath()).toBe('/platform/local-registers/core_environments')
    expect(environmentsRegisterPath('simulator')).toBe('/simulator/local-registers/core_environments')
  })
})

describe('environmentsRedirectPath (old addresses, v1342 D8)', () => {
  const id = '0f409c7e-6b75-459c-b9dc-5dd7bf5a09c2'
  it('Platform list keeps the query string', () => {
    expect(environmentsRedirectPath({ search: '?projectId=SEED334-PRJ-08' }))
      .toBe('/platform/local-registers/core_environments?projectId=SEED334-PRJ-08')
  })
  it('an id opens the same record (view or edit); a name opens the list', () => {
    expect(environmentsRedirectPath({ environmentKey: id })).toBe(`/platform/local-registers/core_environments/${id}`)
    expect(environmentsRedirectPath({ environmentKey: id, mode: 'edit', search: 'projectId=P' }))
      .toBe(`/platform/local-registers/core_environments/${id}/edit?projectId=P`)
    expect(environmentsRedirectPath({ environmentKey: 'Dev', mode: 'edit' })).toBe('/platform/local-registers/core_environments')
  })
  it('new opens the create form', () => {
    expect(environmentsRedirectPath({ mode: 'new', search: '?projectId=P' })).toBe('/platform/local-registers/core_environments/new?projectId=P')
  })
  it('Simulator adds the practice project as the register scope', () => {
    expect(environmentsRedirectPath({ app: 'simulator', practiceProjectId: 'pp1' }))
      .toBe('/simulator/local-registers/core_environments?scopeLevel=project&scopeEntityId=pp1')
    expect(environmentsRedirectPath({ app: 'simulator', practiceProjectId: 'pp1', search: '?scopeLevel=project&scopeEntityId=pp2' }))
      .toBe('/simulator/local-registers/core_environments?scopeLevel=project&scopeEntityId=pp2')
  })
})
