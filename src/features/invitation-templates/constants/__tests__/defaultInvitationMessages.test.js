import { describe, it, expect } from 'vitest'
import {
  DEFAULT_INVITATION_MESSAGES_BY_ROLE,
  INVITATION_TEMPLATE_ROLE_NAMES,
  PROJECT_SCOPED_INVITATION_TEMPLATE_ROLES,
  buildStandardInvitationBody,
} from '../defaultInvitationMessages'

describe('defaultInvitationMessages', () => {
  it('every project-scoped role template includes salutation, invite line, and expiry placeholder', () => {
    for (const roleName of PROJECT_SCOPED_INVITATION_TEMPLATE_ROLES) {
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

  it('pmo_admin template is organisation-scoped', () => {
    const body = DEFAULT_INVITATION_MESSAGES_BY_ROLE.pmo_admin?.message_body
    expect(body).toBeTruthy()
    expect(body).toMatch(/^Dear \{\{invitee_name\}\},/m)
    expect(body).toContain('{{organisation_name}}')
    expect(body).toContain('{{role_name}}')
    expect(body).toContain('{{invitation_expiry_note}}')
    expect(body).not.toContain('{{project_name}}')
  })
})
