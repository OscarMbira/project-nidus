import { describe, it, expect } from 'vitest'
import {
  projectRoleGrantsInvite,
  PROJECT_INVITE_PERMISSION_CODES,
  PROJECT_INVITE_CAPABLE_ROLE_NAMES,
} from '../projectMembershipService'

describe('projectRoleGrantsInvite', () => {
  it('grants invite when permissions include project.manage_users', () => {
    expect(projectRoleGrantsInvite('team_member', ['project.manage_users'])).toBe(true)
  })

  it('grants invite when permissions include user.invite', () => {
    expect(projectRoleGrantsInvite('team_member', ['user.invite', 'project.view'])).toBe(true)
  })

  it('grants invite for project_manager role without explicit permission array', () => {
    expect(projectRoleGrantsInvite('project_manager', null)).toBe(true)
    expect(PROJECT_INVITE_CAPABLE_ROLE_NAMES.has('project_manager')).toBe(true)
  })

  it('denies invite for plain team_member without invite permissions', () => {
    expect(projectRoleGrantsInvite('team_member', ['project.view', 'tasks.view'])).toBe(false)
  })

  it('exports expected permission codes', () => {
    expect(PROJECT_INVITE_PERMISSION_CODES).toContain('user.invite')
    expect(PROJECT_INVITE_PERMISSION_CODES).toContain('project.manage_users')
  })
})
