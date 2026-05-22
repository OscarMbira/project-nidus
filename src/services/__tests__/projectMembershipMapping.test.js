import { describe, it, expect } from 'vitest'
import {
  PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE,
  invitationRoleLookupNames,
} from '../projectMembershipService'

describe('project membership role mapping', () => {
  it('maps five PM-assignable project_roles to legacy invitation role names', () => {
    expect(Object.keys(PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE)).toEqual([
      'team_manager',
      'team_member',
      'project_assurance',
      'quality_assurance',
      'change_authority',
    ])
    expect(PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE.team_member).toBe('pm_team_member')
    expect(PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE.quality_assurance).toBe('pm_quality_assurance')
  })

  it('tries pm_* legacy name before template name for invitations', () => {
    expect(invitationRoleLookupNames('team_member')).toEqual(['pm_team_member', 'team_member'])
    expect(invitationRoleLookupNames('project_manager')).toEqual(['project_manager'])
  })
})
