import { describe, it, expect } from 'vitest'
import {
  invitationProjectSegment,
  invitationRoleSegment,
  buildProjectInvitationUrls,
} from '../invitationUrlUtils'

describe('invitationUrlUtils', () => {
  it('builds a short /i/{token} accept URL', () => {
    expect(invitationProjectSegment('SLB-OBDP', 'Silverline Banking')).toBe('SLB-OBDP')
    const { acceptUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectCode: 'SLB-OBDP',
      projectName: 'Silverline Banking',
      roleName: 'Project Manager',
      invitationToken: 'abc123token',
    })
    expect(acceptUrl).toBe('https://app.example.com/i/abc123token')
  })

  it('still slugifies project/role segments for legacy helpers', () => {
    const { acceptUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectName: 'Silverline Banking',
      roleName: 'Project Manager',
      invitationToken: 'tok',
    })
    expect(acceptUrl).toBe('https://app.example.com/i/tok')
  })

  it('appends decline action to the short URL query string', () => {
    const { declineUrl } = buildProjectInvitationUrls({
      origin: 'https://app.example.com',
      projectCode: 'PRJ-1',
      roleName: 'team_member',
      invitationToken: 'x',
    })
    expect(declineUrl).toBe('https://app.example.com/i/x?action=decline')
  })

  it('returns null URLs when token or origin is missing', () => {
    expect(buildProjectInvitationUrls({ invitationToken: 'tok', origin: '' })).toEqual({
      acceptUrl: null,
      declineUrl: null,
    })
    expect(buildProjectInvitationUrls({ origin: 'https://app.example.com' })).toEqual({
      acceptUrl: null,
      declineUrl: null,
    })
  })

  it('slugifies role segment', () => {
    expect(invitationRoleSegment('Project Manager')).toBe('project-manager')
  })
})
