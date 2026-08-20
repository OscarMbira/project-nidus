import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectStatuses from '../ProjectStatuses.jsx'

// v871 retrofit: this reference-data admin page (project_statuses lookup table) gained
// an Audit details tab alongside its existing inline add/edit panel. This test guards
// that the tab renders both the create-only placeholder and, once a row is selected for
// edit, the standard Identity/Classification/Record history cards.

const { STATUS_ROW } = vi.hoisted(() => ({
  STATUS_ROW: {
    id: 'status-1',
    status_code: 'IN_PROGRESS',
    status_name: 'In Progress',
    status_description: 'Work underway',
    status_color: '#3B82F6',
    status_icon: '',
    status_order: 2,
    is_initial_status: false,
    is_final_status: false,
    is_active_status: true,
    is_active: true,
    created_by: 'user-1',
    updated_by: 'user-2',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
}))

vi.mock('../../../services/projectStatusService', () => ({
  getProjectStatuses: vi.fn().mockResolvedValue({ success: true, data: [STATUS_ROW] }),
  createProjectStatus: vi.fn(),
  updateProjectStatus: vi.fn(),
  deleteProjectStatus: vi.fn(),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: {},
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    resolveAuditUserLabels: vi.fn().mockResolvedValue({
      'user-1': 'Alice Admin',
      'user-2': 'Bob Admin',
    }),
  }
})

describe('ProjectStatuses — Audit details tab (v871)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a create-only placeholder when adding a new status', async () => {
    render(
      <MemoryRouter>
        <ProjectStatuses />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('In Progress')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Add Project Status/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))

    expect(screen.getByText(/Audit details appear after this project status is saved/i)).toBeInTheDocument()
  })

  it('shows Identity/Classification/Record history cards with resolved user labels when editing an existing status', async () => {
    render(
      <MemoryRouter>
        <ProjectStatuses />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('In Progress')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))

    await waitFor(() => expect(screen.getByText('Identity')).toBeInTheDocument())
    expect(screen.getByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('Record history')).toBeInTheDocument()
    expect(screen.getAllByText('IN_PROGRESS').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    expect(screen.getByText('Bob Admin')).toBeInTheDocument()
  })
})
