import { describe, it, expect } from 'vitest'
import {
  formatInviteeFullName,
  parseInviteeNamesFromInvitation,
  personalizeInvitationMessage,
  resolveInviteeNamesForInvitation,
  resolveInviterDisplayName,
  resolveInviterDisplayNameFromUser,
  isHandleLikeDisplayName,
  buildInvitationUserProfilePatch,
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

  it('resolveInviterDisplayNameFromUser prefers a real full_name over a stale composed first/last name', () => {
    // Regression: Settings.jsx only exposes a single "Full name" field (no separate
    // first/last name inputs), so first_name/last_name can go stale — e.g. a role title
    // ends up stuffed into last_name from an earlier onboarding flow — while full_name
    // reflects what the user actually edited and wants shown.
    expect(
      resolveInviterDisplayNameFromUser({
        full_name: 'Oscar Mbira',
        first_name: 'Oscar',
        last_name: 'Organisational Administrator',
        email: 'oscar@example.com',
      }),
    ).toBe('Oscar Mbira')
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

  it('buildInvitationUserProfilePatch maps invitation name to full_name, never touches job_title', () => {
    expect(
      buildInvitationUserProfilePatch(
        {
          invited_first_name: 'Arun',
          invited_last_name: 'Quality Manager',
          invited_email: 'qualityassurance@projectastute.com',
          role_display_name: 'Quality Assurance',
        },
        {
          full_name: 'qualityassurance',
          email: 'qualityassurance@projectastute.com',
          job_title: '',
        },
      ),
    ).toEqual({
      full_name: 'Arun Quality Manager',
      first_name: 'Arun',
      last_name: 'Quality Manager',
    })
  })

  it('buildInvitationUserProfilePatch does not overwrite a real profile name', () => {
    expect(
      buildInvitationUserProfilePatch(
        {
          invited_first_name: 'Arun',
          invited_last_name: 'Quality Manager',
          role_display_name: 'Quality Assurance',
        },
        {
          full_name: 'Arun Patel',
          email: 'qualityassurance@projectastute.com',
          first_name: 'Arun',
          last_name: 'Patel',
          job_title: 'QA Lead',
        },
      ),
    ).toEqual({})
  })

  it('buildInvitationUserProfilePatch never sets job_title from role_display_name (v918 decision 4)', () => {
    const patch = buildInvitationUserProfilePatch(
      {
        invited_first_name: 'Arun',
        invited_last_name: 'Quality Manager',
        role_display_name: 'Quality Assurance',
      },
      { full_name: '', email: 'qualityassurance@projectastute.com', job_title: '' },
    )
    expect(patch.job_title).toBeUndefined()
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
