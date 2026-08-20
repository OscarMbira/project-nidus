import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PracticeIssueDetail from '../PracticeIssueDetail.jsx'

// v871 retrofit: this Simulator-only practice issue detail page (sim.practice_issues,
// full audit columns) gained an Audit details tab alongside its existing read-only
// Details view. This test guards that switching tabs shows the standard 3-card panel
// with resolved created_by/updated_by user labels, and that Details renders by default.

const { ISSUE_ROW } = vi.hoisted(() => ({
  ISSUE_ROW: {
    id: 'issue-1',
    practice_project_id: 'project-1',
    issue_title: 'Server outage',
    issue_reference: 'PI-0001',
    issue_description: 'Production server unresponsive.',
    issue_type: 'technical',
    priority: 'high',
    severity: 'major',
    status: 'open',
    created_by: 'user-1',
    updated_by: 'user-2',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
}))

vi.mock('../../../services/sim/practiceIssueService', () => ({
  getPracticeIssueById: vi.fn().mockResolvedValue({ success: true, data: ISSUE_ROW }),
}))

vi.mock('../../../features/local-data-extensions/utils/bootstrapLdeAccount', () => ({
  resolveLdeAccountForCurrentUser: vi.fn().mockResolvedValue({ accountId: null }),
}))

vi.mock('../../../features/local-data-extensions/components/CustomFieldRenderer', () => ({
  default: () => null,
}))

vi.mock('../../../components/ui/ExportRecordButtons', () => ({
  default: () => null,
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {},
  simDb: {},
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    resolveAuditUserLabels: vi.fn().mockResolvedValue({
      'user-1': 'Alice Tester',
      'user-2': 'Bob Tester',
    }),
  }
})

describe('PracticeIssueDetail — Audit details tab (v871, Simulator-only)', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/simulator/practice-issue-register/issue-1?projectId=project-1']}>
        <Routes>
          <Route path="/simulator/practice-issue-register/:id" element={<PracticeIssueDetail />} />
        </Routes>
      </MemoryRouter>,
    )

  it('renders Details tab content by default', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Server outage')).toBeInTheDocument())
    expect(screen.getByText('Production server unresponsive.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows Identity/Classification/Record history cards with resolved user labels on the Audit tab', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Server outage')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))

    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('Record history')).toBeInTheDocument()
    expect(screen.getByText('PI-0001')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Alice Tester')).toBeInTheDocument())
    expect(screen.getByText('Bob Tester')).toBeInTheDocument()
  })
})
