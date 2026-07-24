import { describe, it, expect } from 'vitest'
import {
  invitationProjectSegment,
  invitationRoleSegment,
  buildProjectInvitationUrls,
} from '../invitationUrlUtils'

describe('invitationUrlUtils', () => {
  it('uses project_code in path when provided', () => {
    expect(invitationProjectSegment('SLB-OBDP', 'Silverline Banking')).toBe('SLB-OBDP')
    const { acceptUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectCode: 'SLB-OBDP',
      projectName: 'Silverline Banking',
      roleName: 'Project Manager',
      invitationToken: 'abc123token',
    })
    expect(acceptUrl).toBe(
      'https://app.example.com/auth/invitation/SLB-OBDP/project-manager?token=abc123token',
    )
  })

  it('falls back to slugified project name without code', () => {
    const { acceptUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectName: 'Silverline Banking',
      roleName: 'Project Manager',
      invitationToken: 'tok',
    })
    expect(acceptUrl).toContain('/auth/invitation/silverline-banking/project-manager?token=tok')
  })

  it('appends decline action to query string', () => {
    const { declineUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectCode: 'PRJ-1',
      roleName: 'team_member',
      invitationToken: 'x',
    })
    expect(declineUrl).toBe(
      'https://app.example.com/auth/invitation/PRJ-1/team-member?token=x&action=decline',
    )
  })

  it('slugifies role segment', () => {
    expect(invitationRoleSegment('Project Manager')).toBe('project-manager')
  })
})
