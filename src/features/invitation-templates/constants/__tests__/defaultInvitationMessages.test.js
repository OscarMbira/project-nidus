import { describe, it, expect } from 'vitest'
import {
  DEFAULT_INVITATION_MESSAGES_BY_ROLE,
  INVITATION_TEMPLATE_ROLE_NAMES,
  buildStandardInvitationBody,
} from '../defaultInvitationMessages'

describe('defaultInvitationMessages', () => {
  it('every role template includes salutation, invite line, and expiry placeholder', () => {
    for (const roleName of INVITATION_TEMPLATE_ROLE_NAMES) {
      const body = DEFAULT_INVITATION_MESSAGES_BY_ROLE[roleName]?.message_body
      expect(body, roleName).toBeTruthy()
      expect(body).toMatch(/^Dear \{\{invitee_name\}\},/m)
      expect(body).toContain('{{project_name}}')
      expect(body).toContain('{{role_name}}')
      expect(body).toContain('{{invitation_expiry_note}}')
      expect(body).not.toContain('{{sender_name}}')
    }
  })

  it('buildStandardInvitationBody wraps role-specific copy', () => {
    const body = buildStandardInvitationBody('Custom role duties here.')
    expect(body).toContain('Custom role duties here.')
    expect(body).toContain('{{invitation_expiry_note}}')
  })
})
