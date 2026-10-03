import { describe, expect, it } from 'vitest'
import { unionProjectRoleRows } from '../projectRoleRows.js'

const userId = '11111111-1111-1111-1111-111111111111'

describe('unionProjectRoleRows', () => {
  it('adds a project the user manages when they have no membership row', () => {
    const rows = unionProjectRoleRows([], [{
      id: 'proj-1',
      project_name: 'Velocity Freight',
      project_code: 'SEED334-PRJ-08',
      project_manager_user_id: userId,
      owner_user_id: null,
    }], userId)

    expect(rows).toHaveLength(1)
    expect(rows[0].project_id).toBe('proj-1')
    expect(rows[0].projects.project_name).toBe('Velocity Freight')
    expect(rows[0].project_roles.role_display_name).toBe('Project Manager')
  })

  it('does not duplicate a project that already has a membership', () => {
    const rows = unionProjectRoleRows([{
      project_id: 'proj-1',
      projects: { project_name: 'Velocity Freight', project_code: 'SEED334-PRJ-08' },
      project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
    }], [{
      id: 'proj-1',
      project_name: 'Velocity Freight',
      project_code: 'SEED334-PRJ-08',
      project_manager_user_id: userId,
    }], userId)

    expect(rows).toHaveLength(1)
    expect(rows[0].project_roles.role_name).toBe('project_manager')
  })

  it('fills a membership whose project embed was empty from the managed project', () => {
    const rows = unionProjectRoleRows([{
      project_id: 'proj-1',
      projects: null,
      project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
    }], [{
      id: 'proj-1',
      project_name: 'Velocity Freight',
      project_code: 'SEED334-PRJ-08',
      project_manager_user_id: userId,
    }], userId)

    expect(rows).toHaveLength(1)
    expect(rows[0].projects.project_code).toBe('SEED334-PRJ-08')
  })
})
