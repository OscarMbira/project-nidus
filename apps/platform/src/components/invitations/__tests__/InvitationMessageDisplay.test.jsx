import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InvitationMessageDisplay from '../InvitationMessageDisplay'

const SAMPLE = `You have been invited to join **Helix** as **Team Member**. Welcome to the team.

Please accept within **7 days** — this invitation expires **7 calendar days** after it is sent.

Kind regards,
**Oscar**
our organisation`

describe('InvitationMessageDisplay', () => {
  it('renders bold text without raw markdown asterisks', () => {
    render(
      <InvitationMessageDisplay
        message={SAMPLE}
        organisationName="Hifo Solutions"
        inviterName="Oscar"
      />,
    )
    expect(screen.getByText(/Message from your inviter/i)).toBeInTheDocument()
    expect(screen.getByText(/on behalf of/i)).toBeInTheDocument()
    expect(screen.getAllByText('Hifo Solutions').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Welcome to the team/i)).toBeInTheDocument()
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
    expect(screen.getByText(/Please accept within/i)).toBeInTheDocument()
    expect(screen.getAllByText('Oscar').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/our organisation/i)).not.toBeInTheDocument()
  })

  it('uses invitee display name in sign-off when provided', () => {
    const msg = `Welcome to the team.

Kind regards,
**StoredInviterHandle**
Hifo Solutions`
    render(
      <InvitationMessageDisplay
        message={msg}
        organisationName="Hifo Solutions"
        inviterName="Pat PM"
        inviteeDisplayName="Jane Doe"
      />,
    )
    expect(screen.getByText('Pat PM')).toBeInTheDocument()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('StoredInviterHandle')).not.toBeInTheDocument()
  })

  it('shows organisation under sign-off when only inviter name is in the template', () => {
    const msg = `Welcome to the team.

Kind regards,
**Pat PM**`
    render(
      <InvitationMessageDisplay message={msg} organisationName="Acme Corp" inviterName="Pat PM" />,
    )
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pat PM').length).toBeGreaterThanOrEqual(1)
  })
})
