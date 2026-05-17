import { describe, it, expect } from 'vitest'
import {
  stripRedundantInvitationIntro,
  parseInvitationMessageBlocks,
  formatInvitationPersonalMessageHtml,
  formatInvitationPersonalMessagePlain,
  normalizeInvitationMessageOrganisation,
} from '../invitationMessageEmailFormat'

const SAMPLE = `You have been invited to join **Helix Robotics** as **Project Manager**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.

Please accept within **7 days** — this invitation expires **7 calendar days** after it is sent.

Kind regards,
**Oscar Project Executive**
our organisation`

describe('invitationMessageEmailFormat', () => {
  it('strips redundant intro sentence', () => {
    const block =
      'You have been invited to join **Helix** as **Project Manager**. You will lead delivery.'
    expect(stripRedundantInvitationIntro(block)).toBe('You will lead delivery.')
  })

  it('parses body, expiry, and sign-off blocks', () => {
    const { body, expiry, signOff } = parseInvitationMessageBlocks(SAMPLE)
    expect(body).toHaveLength(1)
    expect(body[0]).toContain('lead day-to-day')
    expect(expiry).toContain('Please accept within')
    expect(signOff).toContain('Kind regards')
  })

  it('renders HTML without raw markdown asterisks', () => {
    const html = formatInvitationPersonalMessageHtml(SAMPLE)
    expect(html).not.toContain('**')
    expect(html).toContain('<strong>')
    expect(html).toContain('lead day-to-day')
    expect(html).not.toContain('You have been invited to join')
    expect(html).toContain('Kind regards,</p>')
  })

  it('formats plain text without markdown', () => {
    const text = formatInvitationPersonalMessagePlain(SAMPLE)
    expect(text).not.toContain('**')
    expect(text).toContain('Oscar Project Executive')
  })

  it('replaces generic organisation line with real organisation name', () => {
    const normalized = normalizeInvitationMessageOrganisation(SAMPLE, 'Hifo Solutions')
    const html = formatInvitationPersonalMessageHtml(normalized, {
      skipRedundantIntro: true,
      organisationName: 'Hifo Solutions',
    })
    expect(html).toContain('Hifo Solutions')
    expect(html).not.toContain('our organisation')
  })
})
