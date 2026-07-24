import { describe, it, expect } from 'vitest'
import {
  getInvitationDeclinedMessage,
  getInvitationScopeHeading,
  getInvitationTargetLabel,
  isOrganisationScopeInvitation,
} from '../invitationScopeUtils'

describe('invitationScopeUtils', () => {
  it('detects organisation-scoped invitations when project_id is null', () => {
    expect(isOrganisationScopeInvitation({ project_id: null })).toBe(true)
    expect(isOrganisationScopeInvitation({ project_id: 'proj-1' })).toBe(false)
  })

  it('returns organisation labels for PMO invites', () => {
    const invitation = {
      project_id: null,
      organisation_name: 'Hifo Solutions',
      project_name: 'Hifo Solutions',
    }
    expect(getInvitationScopeHeading(invitation)).toBe('Organisation invitation')
    expect(getInvitationTargetLabel(invitation)).toBe('Hifo Solutions')
    expect(getInvitationDeclinedMessage(invitation)).toMatch(/organisation invitation/i)
  })
})
