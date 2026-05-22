import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../../../context/ThemeContext'
import InvitationAccept from '../InvitationAccept'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockGetInvitationAcceptContext = vi.hoisted(() => vi.fn())
const mockGetInvitationByToken = vi.hoisted(() => vi.fn())
const mockDeclineInvitationByToken = vi.hoisted(() => vi.fn())
const mockAcceptInvitation = vi.hoisted(() => vi.fn())
const mockGetUser = vi.hoisted(() => vi.fn())
const mockRpc = vi.hoisted(() => vi.fn())
const mockSignInWithPassword = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('../../../services/invitationService', () => ({
  getInvitationAcceptContext: (...args) => mockGetInvitationAcceptContext(...args),
  getInvitationByToken: (...args) => mockGetInvitationByToken(...args),
}))

vi.mock('../../../services/projectMembershipService', () => ({
  acceptInvitation: (...args) => mockAcceptInvitation(...args),
  declineInvitationByToken: (...args) => mockDeclineInvitationByToken(...args),
}))

vi.mock('../../../services/managerAppointmentService', () => ({
  getManagerAppointmentByInvitationId: vi.fn().mockResolvedValue({ success: false, data: null }),
  acceptManagerAppointment: vi.fn().mockResolvedValue({ success: true }),
  declineManagerAppointment: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../../services/teamMemberAppointmentService', () => ({
  getTeamMemberAppointmentByInvitationId: vi.fn().mockResolvedValue({ success: false, data: null }),
  acceptTeamMemberAppointment: vi.fn().mockResolvedValue({ success: true }),
  declineTeamMemberAppointment: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  appDb: {
    auth: {
      getUser: () => mockGetUser(),
      signInWithPassword: (creds) => mockSignInWithPassword(creds),
    },
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: false, error: 'not configured' }, error: null }),
    },
  },
}))

// ── Shared invitation data ────────────────────────────────────────────────────
const BASE_INVITATION = {
  invitation_id: 'inv-uuid-1',
  project_id: 'proj-1',
  project_name: 'Demo Project',
  invited_email: 'invitee@example.com',
  invited_first_name: 'Jane',
  invited_last_name: 'Doe',
  role_name: 'pm_quality_assurance',
  role_display_name: 'Quality Assurance (PM)',
  invited_by_name: 'PM Person',
  inviter_display_name: 'PM Person',
  organisation_name: 'Hifo Solutions Ltd',
  planned_start_date: '2026-03-01',
  planned_end_date: '2026-11-30',
  is_valid: true,
  expires_at: '2026-05-25T00:00:00.000Z',
  invitation_message: 'Welcome aboard',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderInvitation(token = 'tok-1') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/auth/invitation/${token}`]}>
        <Routes>
          <Route path="/auth/invitation/:token" element={<InvitationAccept />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

/** Default from() chain: returns null for all queries (no existing user row). */
function mockFromNoUser() {
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  })
}

/** from() chain that returns a user row (id = 'db-user-1'). */
function mockFromWithUser(id = 'db-user-1') {
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id }, error: null }), maybeSingle: () => Promise.resolve({ data: { id }, error: null }) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  })
}

// ── beforeEach defaults ───────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()

  mockGetInvitationAcceptContext.mockResolvedValue({ success: true, data: { ...BASE_INVITATION } })
  mockGetInvitationByToken.mockResolvedValue({ success: true, data: { id: 'inv-uuid-1', invitation_status: 'pending' } })
  mockAcceptInvitation.mockResolvedValue({ success: true })
  mockDeclineInvitationByToken.mockResolvedValue({ success: true })
  mockFromNoUser()

  // Default RPC: email has no auth account → 'new' state
  mockRpc.mockResolvedValue({ data: false, error: null })
})

// ── Test suites ───────────────────────────────────────────────────────────────

describe('InvitationAccept — authenticated user (already signed in)', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFromWithUser()
  })

  it('shows Accept / Decline buttons without password fields', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Project invitation/i })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /Accept Invitation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Decline Invitation/i })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/At least 6 characters/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Your password/i)).not.toBeInTheDocument()
  })

  it('accepts invitation and navigates to project', async () => {
    const user = userEvent.setup()
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('button', { name: /Accept Invitation/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Accept Invitation/i }))

    await waitFor(() => expect(mockAcceptInvitation).toHaveBeenCalledWith('tok-1', 'db-user-1'))
  })

  it('opens decline confirmation and declines', async () => {
    const user = userEvent.setup()
    renderInvitation()
    await waitFor(
      () => expect(screen.getByRole('button', { name: /Decline Invitation/i })).toBeInTheDocument(),
      { timeout: 10000 },
    )

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))
    expect(screen.getByText(/Decline this invitation/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))
    await waitFor(() => expect(mockDeclineInvitationByToken).toHaveBeenCalledWith('tok-1'), { timeout: 8000 })
    expect(screen.getByRole('heading', { name: /Invitation declined/i })).toBeInTheDocument()
  }, 20000)
})

describe('InvitationAccept — registered user (has account, not signed in)', () => {
  beforeEach(() => {
    // Not signed in
    mockGetUser.mockResolvedValue({ data: { user: null } })
    // RPC says email has an auth account
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  it('shows "Welcome back" sign-in form with pre-filled email and no confirm-password field', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByText(/Welcome back/i)).toBeInTheDocument())

    expect(screen.getAllByText('invitee@example.com')[0]).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Forgot password/i })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/At least 6 characters/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Confirm your password/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In.*Accept/i })).toBeInTheDocument()
  })

  it('calls signInWithPassword then acceptInvitation on submit', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-2' }, session: {} },
      error: null,
    })
    mockFromWithUser('db-user-2')

    const user = userEvent.setup()
    renderInvitation()
    await waitFor(() => expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText(/Your password/i), 'mypassword')
    await user.click(screen.getByRole('button', { name: /Sign In.*Accept/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'invitee@example.com',
        password: 'mypassword',
      })
    })
    await waitFor(() => expect(mockAcceptInvitation).toHaveBeenCalledWith('tok-1', 'db-user-2'))
  })

  it('shows an error when wrong password is entered', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })

    const user = userEvent.setup()
    renderInvitation()
    await waitFor(() => expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText(/Your password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /Sign In.*Accept/i }))

    await waitFor(() => expect(screen.getByText(/Incorrect password/i)).toBeInTheDocument())
    expect(mockAcceptInvitation).not.toHaveBeenCalled()
  })

  it('decline works in registered state', async () => {
    const user = userEvent.setup()
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('button', { name: /Decline Invitation/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))
    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))

    await waitFor(() => expect(mockDeclineInvitationByToken).toHaveBeenCalledWith('tok-1'))
  })
})

describe('InvitationAccept — new user (no account)', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockRpc.mockResolvedValue({ data: false, error: null })
  })

  it('shows Create account form with password + confirm fields', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByText(/Create your account/i)).toBeInTheDocument())

    expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Confirm your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Accept.*Create Account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Already have an account/i })).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderInvitation()
    await waitFor(
      () => expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument(),
      { timeout: 8000 },
    )

    await user.type(screen.getByPlaceholderText(/At least 6 characters/i), 'password1')
    await user.type(screen.getByPlaceholderText(/Confirm your password/i), 'password2')
    await user.click(screen.getByRole('button', { name: /Accept.*Create Account/i }))

    await waitFor(
      () => expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument(),
      { timeout: 8000 },
    )
  }, 20000)

  it('calls declineInvitationByToken with route token', async () => {
    const user = userEvent.setup()
    renderInvitation('secret-token')

    await waitFor(() => expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))
    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))

    await waitFor(() => expect(mockDeclineInvitationByToken).toHaveBeenCalledWith('secret-token'))
  })
})

describe('InvitationAccept — invitation metadata', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFromWithUser()
  })

  it('shows invitation metadata in two-column rows including project dates', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Project invitation/i })).toBeInTheDocument())

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Sent by')).toBeInTheDocument()
    expect(screen.getByText('Organisation')).toBeInTheDocument()
    expect(screen.getByText('Your email')).toBeInTheDocument()
    expect(screen.getByText('Invitation expires')).toBeInTheDocument()
    expect(screen.getByText('Project start')).toBeInTheDocument()
    expect(screen.getByText('Project end')).toBeInTheDocument()
    expect(screen.getByText(/Mar/i)).toBeInTheDocument()
    expect(screen.getByText(/Nov/i)).toBeInTheDocument()
    expect(screen.getAllByText('Hifo Solutions Ltd').length).toBeGreaterThanOrEqual(1)
  })

  it('shows invitee name parsed from Dear greeting when DB name columns are empty', async () => {
    mockGetInvitationAcceptContext.mockResolvedValueOnce({
      success: true,
      data: {
        ...BASE_INVITATION,
        invited_first_name: null,
        invited_last_name: null,
        invitation_message: 'Dear Maricus Mutamba,\n\nWelcome aboard.',
      },
    })

    renderInvitation()
    await waitFor(() => expect(screen.getAllByText('Maricus Mutamba').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})

describe('InvitationAccept — layout / header', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFromWithUser()
  })

  it('disables Platform and Simulator header buttons', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Project invitation/i })).toBeInTheDocument())

    expect(
      screen.getByRole('button', { name: /Platform \(available after accepting your invitation\)/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /Simulator \(available after accepting your invitation\)/i }),
    ).toBeDisabled()
  })

  it('renders Platform branded footer', async () => {
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Project invitation/i })).toBeInTheDocument())

    expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument()
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument()
  })

  it('renders theme toggle and disabled header buttons on declined success page', async () => {
    const user = userEvent.setup()
    renderInvitation()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Project invitation/i })).toBeInTheDocument())
    expect(screen.getByTestId('theme-toggle-button')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Decline Invitation/i }))
    await user.click(screen.getByRole('button', { name: /Confirm decline/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /Invitation declined/i })).toBeInTheDocument())

    expect(screen.getByTestId('theme-toggle-button')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Platform \(available after accepting your invitation\)/i }),
    ).toBeDisabled()
    expect(screen.getByText(/What happens next/i)).toBeInTheDocument()
  })

  it('disables Platform and Simulator buttons on decline confirmation (?action=decline)', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/auth/invitation/tok-1?action=decline']}>
          <Routes>
            <Route path="/auth/invitation/:token" element={<InvitationAccept />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Decline invitation/i })).toBeInTheDocument())

    expect(
      screen.getByRole('button', { name: /Platform \(available after accepting your invitation\)/i }),
    ).toBeDisabled()
  })
})
