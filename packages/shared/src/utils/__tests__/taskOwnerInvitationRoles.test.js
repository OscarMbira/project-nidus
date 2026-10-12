import { describe, expect, it } from 'vitest'
import { bestInvitationRole, userMatchesInvitation } from '../taskOwnerInvitationRoles.js'

const oscar = { id: 'u-oscar', email: 'oscar@example.com' }

describe('bestInvitationRole', () => {
  it('matches an invitation by email when the user id was not stored', () => {
    expect(userMatchesInvitation(oscar, { invited_email: 'Oscar@example.com' })).toBe(true)
  })

  it('prefers this project, then an accepted organisation invitation', () => {
    const label = bestInvitationRole(oscar, [
      {
        invited_email: 'oscar@example.com',
        invitation_status: 'accepted',
        invitation_sent_at: '2026-01-01',
        role_name: 'PMO Admin',
        _scopeRank: 1,
      },
      {
        invited_user_id: 'u-oscar',
        invitation_status: 'pending',
        invitation_sent_at: '2026-06-01',
        role: { role_display_name: 'Developer' },
        _scopeRank: 0,
      },
    ])
    expect(label).toBe('Developer')
  })

  it('ignores declined invitations', () => {
    const label = bestInvitationRole(oscar, [
      {
        invited_user_id: 'u-oscar',
        invitation_status: 'declined',
        role: { role_display_name: 'Tester' },
        _scopeRank: 0,
      },
    ])
    expect(label).toBe('')
  })
})
