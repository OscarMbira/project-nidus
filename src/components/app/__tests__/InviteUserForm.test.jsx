import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InviteUserForm from '../InviteUserForm'

const mockGetTemplateForRole = vi.hoisted(() => vi.fn())

vi.mock('../../../features/invitation-templates/hooks/useInvitationTemplates', () => ({
  useInvitationTemplates: () => ({
    templates: [],
    loading: false,
    error: null,
    getTemplateForRole: mockGetTemplateForRole,
    refetch: vi.fn(),
  }),
}))

const mockAuthGetUser = vi.hoisted(() => vi.fn())

vi.mock('../../../services/invitationExpiryService', () => ({
  clampInvitationExpiryDays: (d) => Math.min(365, Math.max(1, Math.round(Number(d)) || 7)),
  fetchDefaultInvitationExpiryDaysForProject: vi.fn(() =>
    Promise.resolve({ success: true, days: 14, error: null }),
  ),
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn((table) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    project_name: 'Demo Project',
                    account_id: 'acc-1',
                    accounts: { account_display_name: 'Acme Org' },
                  },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { full_name: 'Inviter Person' }, error: null }),
            }),
          }),
        }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }
    }),
    auth: {
      getUser: () => mockAuthGetUser(),
    },
  },
}))

vi.mock('../../../services/projectMembershipService', () => ({
  inviteUserToProject: vi.fn(() => Promise.resolve({ success: true })),
  pmoAddExistingUserToProject: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('../../../services/seatManagementService', () => ({
  checkSeatAvailability: vi.fn(() =>
    Promise.resolve({ success: true, data: { current_count: 1, total_seats: 10 } }),
  ),
}))

vi.mock('../../../services/projectRoleAssignmentService', () => ({
  getProjectManagerAssignableRoles: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          id: 'role-a',
          role_name: 'team_member',
          role_display_name: 'Team Member',
        },
        {
          id: 'role-b',
          role_name: 'project_manager',
          role_display_name: 'Project Manager',
        },
      ],
    }),
  ),
  getPmoMembershipAssignableRoles: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        { id: 'role-a', role_name: 'team_member', role_display_name: 'Team Member' },
        { id: 'role-b', role_name: 'project_manager', role_display_name: 'Project Manager' },
      ],
    }),
  ),
}))

describe('InviteUserForm', () => {
  beforeEach(() => {
    mockGetTemplateForRole.mockReset()
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.c' } }, error: null })
    mockGetTemplateForRole.mockImplementation((roleName) => {
      if (roleName === 'team_member') {
        return {
          role_name: 'team_member',
          message_body: 'Welcome to {{project_name}} as {{role_name}} from {{inviter_name}}.',
          is_active: true,
        }
      }
      if (roleName === 'project_manager') {
        return {
          role_name: 'project_manager',
          message_body: 'PM invite {{project_name}}.',
          is_active: true,
        }
      }
      return null
    })
  })

  it('pre-fills message from template when role is selected', async () => {
    const user = userEvent.setup()
    render(<InviteUserForm projectId="proj-1" />)
    await waitFor(() => expect(screen.getByPlaceholderText(/user@example/i)).toBeInTheDocument())
    const msg = await screen.findByPlaceholderText(/Add a personal message/i)
    await waitFor(() => {
      expect(msg.value).toContain('Demo Project')
      expect(msg.value).toContain('Team Member')
      expect(msg.value).toContain('Inviter Person')
    })
    await user.selectOptions(screen.getByRole('combobox'), 'role-b')
    await waitFor(() => {
      expect(msg.value).toContain('PM invite')
      expect(msg.value).toContain('Demo Project')
    })
  })

  it('shows restore prompt when role changes after custom edit', async () => {
    const user = userEvent.setup()
    render(<InviteUserForm projectId="proj-1" />)
    await waitFor(() => expect(screen.getByPlaceholderText(/Add a personal message/i)).toBeInTheDocument())
    const msg = screen.getByPlaceholderText(/Add a personal message/i)
    await user.clear(msg)
    await user.type(msg, 'My custom note')
    await user.selectOptions(screen.getByRole('combobox'), 'role-b')
    expect(await screen.findByRole('button', { name: /Role changed.*restore default/i })).toBeInTheDocument()
  })

  it('reset to default restores template for current role', async () => {
    const user = userEvent.setup()
    render(<InviteUserForm projectId="proj-1" />)
    const msg = await screen.findByPlaceholderText(/Add a personal message/i)
    await waitFor(() => expect(msg.value.length).toBeGreaterThan(0))
    await user.clear(msg)
    await user.type(msg, 'temporary')
    await user.click(screen.getByRole('button', { name: /reset to default/i }))
    await waitFor(() => {
      expect(msg.value).toContain('Demo Project')
      expect(msg.value).not.toBe('temporary')
    })
  })
})
