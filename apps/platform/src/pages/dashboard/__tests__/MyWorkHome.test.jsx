/**
 * MyWorkHome tests (v982 Phase 7 — Main Application Zones) — the one genuinely new zone this
 * phase introduces. Verifies it renders real, DB-driven project membership data (not mocked/
 * invented content, rule 26) and de-dupes correctly.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPlatformDb, mockNavigate } = vi.hoisted(() => ({
  mockPlatformDb: { auth: { getUser: vi.fn() } },
  mockNavigate: vi.fn(),
}))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('../../../services/roleService', () => ({
  getUserProjectRoles: vi.fn(),
}))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserInternalUserId: vi.fn(() => Promise.resolve('user-1')),
}))
vi.mock('../../../services/myWorkService', () => ({
  getMyOpenRaidItems: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}))

import { getUserProjectRoles } from '../../../services/roleService'
import { getMyOpenRaidItems } from '../../../services/myWorkService'
import MyWorkHome from '../MyWorkHome'

describe('MyWorkHome', () => {
  it('renders each distinct project the user has a role on, de-duped, with its role(s)', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    getUserProjectRoles.mockResolvedValue({
      success: true,
      data: [
        { project_id: 'p1', projects: { project_name: 'Alpha', project_code: 'ALP-001' }, project_roles: { role_display_name: 'Project Manager' } },
        // A second active membership row on the SAME project (duplicate invite scenario) — must
        // de-dupe to one card, merging the role label.
        { project_id: 'p1', projects: { project_name: 'Alpha', project_code: 'ALP-001' }, project_roles: { role_display_name: 'Team Member' } },
        { project_id: 'p2', projects: { project_name: 'Beta', project_code: 'BET-002' }, project_roles: { role_display_name: 'Project Manager' } },
      ],
    })

    render(<MemoryRouter><MyWorkHome /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2) // one card per distinct project, not per membership row
    expect(screen.getByText(/Project Manager, Team Member/)).toBeInTheDocument()
  })

  it('shows the empty state for a user with no project memberships (not an error, not mock data)', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    getUserProjectRoles.mockResolvedValue({ success: true, data: [] })

    render(<MemoryRouter><MyWorkHome /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText(/not a member of any project yet/i)).toBeInTheDocument())
  })

  it('navigates to that project\'s PM dashboard, scoped by project_code, when a card is clicked', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    getUserProjectRoles.mockResolvedValue({
      success: true,
      data: [{ project_id: 'p1', projects: { project_name: 'Alpha', project_code: 'ALP-001' }, project_roles: { role_display_name: 'Project Manager' } }],
    })

    render(<MemoryRouter><MyWorkHome /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alpha').closest('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/pm/dashboard?projectId=ALP-001')
  })

  it('surfaces a real error rather than silently showing an empty/fake state', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    getUserProjectRoles.mockResolvedValue({ success: false, data: [], error: 'Network error' })

    render(<MemoryRouter><MyWorkHome /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument())
  })

  describe('Assigned to You (v982 Phase 7 follow-up — RAID items via raid_log)', () => {
    it('renders each open RAID item owned by the viewer, labelled by type and project', async () => {
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      getUserProjectRoles.mockResolvedValue({ success: true, data: [] })
      getMyOpenRaidItems.mockResolvedValue({
        success: true,
        data: [
          { raid_type: 'risk', id: 'r1', title: 'Vendor delay risk', projects: { project_name: 'Alpha' } },
          { raid_type: 'issue', id: 'i1', title: 'Data migration blocker', projects: { project_name: 'Beta' } },
        ],
      })

      render(<MemoryRouter><MyWorkHome /></MemoryRouter>)

      await waitFor(() => expect(screen.getByText('Vendor delay risk')).toBeInTheDocument())
      expect(screen.getByText('Data migration blocker')).toBeInTheDocument()
      expect(screen.getByText('Risk')).toBeInTheDocument()
      expect(screen.getByText('Issue')).toBeInTheDocument()
    })

    it('shows an honest empty state when nothing is assigned — not silently hidden, not fake content', async () => {
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      getUserProjectRoles.mockResolvedValue({ success: true, data: [] })
      getMyOpenRaidItems.mockResolvedValue({ success: true, data: [] })

      render(<MemoryRouter><MyWorkHome /></MemoryRouter>)

      await waitFor(() => expect(screen.getByText(/no open risks, issues, assumptions, or dependencies/i)).toBeInTheDocument())
    })
  })
})
