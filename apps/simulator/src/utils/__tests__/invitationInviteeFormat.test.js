import { describe, it, expect } from 'vitest'
import {
  formatInviteeFullName,
  parseInviteeNamesFromInvitation,
  personalizeInvitationMessage,
  resolveInviteeNamesForInvitation,
  resolveInviterDisplayName,
  resolveInviterDisplayNameFromUser,
  isHandleLikeDisplayName,
} from '../invitationInviteeFormat'

describe('invitationInviteeFormat', () => {
  it('formats full name', () => {
    expect(formatInviteeFullName('Ada', 'Lovelace')).toBe('Ada Lovelace')
    expect(formatInviteeFullName('Ada', '')).toBe('Ada')
  })

  it('replaces invitee placeholders', () => {
    const out = personalizeInvitationMessage('Hello {{invitee_first_name}} {{invitee_last_name}}', {
      inviteeFirstName: 'Ada',
      inviteeLastName: 'Lovelace',
    })
    expect(out).toBe('Hello Ada Lovelace')
  })

  it('parses invitee names from invitation row', () => {
    expect(
      parseInviteeNamesFromInvitation({
        invited_first_name: 'Jane',
        invited_last_name: 'Doe',
      }),
    ).toEqual({ first: 'Jane', last: 'Doe', full: 'Jane Doe' })
  })

  it('falls back to Dear greeting in stored message when DB columns empty', () => {
    expect(
      resolveInviteeNamesForInvitation({
        invitation_message: 'Dear Maricus Mutamba,\n\nWelcome to the team.',
      }),
    ).toEqual({ first: 'Maricus', last: 'Mutamba', full: 'Maricus Mutamba' })
  })

  it('prefers inviter_display_name for sent-by label', () => {
    expect(
      resolveInviterDisplayName({
        inviter_display_name: 'Pat PM',
        invited_by_name: 'oscarmbirablogging',
      }),
    ).toBe('Pat PM')
  })

  it('resolveInviterDisplayNameFromUser prefers first and last over handle full_name', () => {
    expect(
      resolveInviterDisplayNameFromUser(
        {
          full_name: 'oscarmbirablogging',
          first_name: 'Oscar',
          last_name: 'Mbirablogging',
          email: 'oscarmbirablogging@gmail.com',
        },
        'oscarmbirablogging@gmail.com',
      ),
    ).toBe('Oscar Mbirablogging')
  })

  it('isHandleLikeDisplayName detects email-prefix names', () => {
    expect(isHandleLikeDisplayName('oscarmbirablogging', 'oscarmbirablogging@gmail.com')).toBe(true)
    expect(isHandleLikeDisplayName('Pat PM', 'pat@example.com')).toBe(false)
  })

  it('skips handle-like inviter_display_name when first/last present', () => {
    expect(
      resolveInviterDisplayName({
        inviter_display_name: 'oscarmbirablogging',
        invited_by_email: 'oscarmbirablogging@gmail.com',
        inviter_first_name: 'Oscar',
        inviter_last_name: 'Mbirablogging',
      }),
    ).toBe('Oscar Mbirablogging')
  })

  it('prepends Dear greeting when name not in body', () => {
    const out = personalizeInvitationMessage('Welcome to the team.', {
      inviteeFirstName: 'John',
      inviteeLastName: 'Smith',
    })
    expect(out.startsWith('Dear John Smith,')).toBe(true)
    expect(out).toContain('Welcome to the team.')
  })
})
