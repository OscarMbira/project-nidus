import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import InvitationAccept from '../InvitationAccept'

const mockValidateInvitationToken = vi.hoisted(() => vi.fn())
const mockGetInvitationByToken = vi.hoisted(() => vi.fn())
const mockDeclineInvitationByToken = vi.hoisted(() => vi.fn())
const mockAcceptInvitation = vi.hoisted(() => vi.fn())
const mockGetUser = vi.hoisted(() => vi.fn())

vi.mock('../../../services/invitationService', () => ({
  validateInvitationToken: (...args) => mockValidateInvitationToken(...args),
  getInvitationByToken: (...args) => mockGetInvitationByToken(...args),
}))

vi.mock('../../../services/projectMembershipService', () => ({
  acceptInvitation: (...args) => mockAcceptInvitation(...args),
  declineInvitationByToken: (...args) => mockDeclineInvitationByToken(...args),
}))

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

function renderInvitation(token = 'tok-1') {
  return render(
    <MemoryRouter initialEntries={[`/auth/invitation/${token}`]}>
      <Routes>
        <Route path="/auth/invitation/:token" element={<InvitationAccept />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvitationAccept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateInvitationToken.mockResolvedValue({
      success: true,
      data: {
        invitation_id: 'inv-uuid-1',
        project_id: 'proj-1',
        project_name: 'Demo Project',
        invited_email: 'invitee@example.com',
        role_name: 'pm_quality_assurance',
        role_display_name: 'Quality Assurance (PM)',
        invited_by_name: 'PM Person',
        is_valid: true,
        expires_at: null,
        invitation_message: 'Welcome aboard',
      },
    })
    mockGetInvitationByToken.mockResolvedValue({
      success: true,
      data: { id: 'inv-uuid-1' },
    })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
    })
    mockAcceptInvitation.mockResolvedValue({ success: true })
    mockDeclineInvitationByToken.mockResolvedValue({ success: true })
  })

  it('shows Decline Invitation and opens confirmation before declining', async () => {
    const user = userEvent.setup()
    renderInvitation()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Project Invitation/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))

    expect(screen.getByText(/Decline this invitation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm decline/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))

    await waitFor(() => {
      expect(mockDeclineInvitationByToken).toHaveBeenCalledWith('tok-1')
    })

    expect(screen.getByRole('heading', { name: /Invitation declined/i })).toBeInTheDocument()
    expect(screen.getByText(/Invitation ID: inv-uuid-1/i)).toBeInTheDocument()
  })

  it('calls declineInvitationByToken with route token for new-user flow', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const user = userEvent.setup()
    renderInvitation('secret-token')

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))
    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))

    await waitFor(() => {
      expect(mockDeclineInvitationByToken).toHaveBeenCalledWith('secret-token')
    })
  })
})
