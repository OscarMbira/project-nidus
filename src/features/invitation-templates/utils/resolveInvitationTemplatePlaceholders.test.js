import { describe, it, expect } from 'vitest'
import { resolveInvitationTemplatePlaceholders } from './resolveInvitationTemplatePlaceholders'
import { buildMockInvitationProjectContext } from '../../../services/invitationProjectContextService'

describe('resolveInvitationTemplatePlaceholders', () => {
  const baseCtx = {
    projectName: 'Live Project',
    roleDisplayName: 'Project Manager',
    inviterName: 'Sam Sender',
    organisationName: 'Acme Ltd',
    invitationExpiryDays: 14,
    projectContext: buildMockInvitationProjectContext(),
  }

  it('resolves core and project context placeholders', () => {
    const body = [
      'Hi — {{project_name}} ({{project_code}})',
      '{{project_description}}',
      'Type: {{project_type}} · Method: {{project_methodology}}',
      '{{project_timeline}}',
      '{{portfolio_context_line}}',
      '{{programme_context_line}}',
    ].join('\n')

    const out = resolveInvitationTemplatePlaceholders(body, baseCtx)
    expect(out).toContain('Sample Project Alpha')
    expect(out).toContain('SP-ALPHA')
    expect(out).toContain('Sample initiative for preview purposes.')
    expect(out).toContain('Strategic Initiative')
    expect(out).toContain('Hybrid PM')
    expect(out).toContain('PF-SAMPLE')
    expect(out).toContain('not currently assigned to a programme')
  })

  it('resolves invitee salutation placeholders', () => {
    const out = resolveInvitationTemplatePlaceholders(
      'Dear {{invitee_name}}, welcome to {{project_name}}.',
      { ...baseCtx, inviteeFirstName: 'Thomas', inviteeLastName: 'Mboko' },
    )
    expect(out).toContain('Dear Thomas Mboko,')
  })

  it('resolves hierarchy and full context block tokens', () => {
    const out = resolveInvitationTemplatePlaceholders(
      '{{hierarchy_block}}\n---\n{{project_context_block}}',
      baseCtx,
    )
    expect(out).toContain('Portfolio: PF-SAMPLE')
    expect(out).toContain('Project context')
    expect(out).toContain('Hierarchy')
  })
})
