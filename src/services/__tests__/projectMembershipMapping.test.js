import { describe, it, expect } from 'vitest'

/**
 * Contract: project_roles template names must map to invitation roles (roles.role_name pm_*)
 * Used by resolveInvitationRoleIdForInsert and SQL accept_project_invitation.
 */
const PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE = {
  team_manager: 'pm_team_manager',
  team_member: 'pm_team_member',
  project_assurance: 'pm_project_assurance',
  quality_assurance: 'pm_quality_assurance',
  change_authority: 'pm_change_authority',
}

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
})
