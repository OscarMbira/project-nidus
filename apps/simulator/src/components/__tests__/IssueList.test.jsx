import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import IssueList, { formatIssueAge, isIssueDueOverdue, getIssueAgeDays } from '../IssueList'

// Mock useNavigate
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'project-1', routeKey: 'PRJ-SEED' }),
}))

describe('IssueList', () => {
  const mockIssues = [
    {
      id: '1',
      issue_title: 'Critical Bug',
      issue_code: 'ISSUE-001',
      issue_description: 'Application crashes on startup',
      issue_type: 'bug',
      priority: 'critical',
      severity: 'critical',
      status: 'new',
      reported_by: { full_name: 'John Doe', email: 'john@example.com' },
      assigned_to: null,
      created_at: '2025-01-15T10:00:00Z',
      date_raised: '2025-01-15',
      due_date: '2025-01-10',
      updated_at: '2025-01-16T12:00:00Z',
    },
    {
      id: '2',
      issue_title: 'Feature Request',
      issue_code: 'ISSUE-002',
      issue_description: 'Add dark mode toggle',
      issue_type: 'enhancement',
      priority: 'medium',
      severity: 'low',
      status: 'in_progress',
      reported_by: { full_name: 'Jane Smith', email: 'jane@example.com' },
      assigned_to: { full_name: 'Bob Wilson', email: 'bob@example.com' },
      created_at: '2025-01-14T10:00:00Z',
      date_raised: '2025-01-14',
      due_date: null,
      updated_at: '2025-01-18T09:00:00Z',
    },
  ]

  const defaultProps = {
    issues: mockIssues,
    onEdit: vi.fn(),
    onRefresh: vi.fn(),
    projectId: 'project-1',
  }

  it('renders issue list with issues', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('Critical Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature Request')).toBeInTheDocument()
  })

  it('displays issue codes', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('ISSUE-001')).toBeInTheDocument()
    expect(screen.getByText('ISSUE-002')).toBeInTheDocument()
  })

  it('displays issue priorities', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('displays issue descriptions', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText(/Application crashes on startup/i)).toBeInTheDocument()
    expect(screen.getByText(/Add dark mode toggle/i)).toBeInTheDocument()
  })

  it('shows empty state when no issues', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} issues={[]} />
      </BrowserRouter>
    )
    expect(screen.getByText(/No Issues yet/i)).toBeInTheDocument()
  })

  it('displays assigned user when available', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText(/Bob Wilson/i)).toBeInTheDocument()
  })

  it('list view shows Aging, Due date, and Last Update columns', () => {
    render(
      <BrowserRouter>
        <IssueList {...defaultProps} viewMode="list" />
      </BrowserRouter>
    )
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Aging')).toBeInTheDocument()
    expect(screen.getByText('Due date')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Last Update')).toBeInTheDocument()
    expect(screen.getByText(formatIssueAge(mockIssues[0]))).toBeInTheDocument()
    expect(screen.getByText('Jan 10, 2025')).toBeInTheDocument()
    expect(screen.getByText('Jan 16, 2025')).toBeInTheDocument()
  })

  it('list view View action navigates to issue detail using display id', () => {
    navigateMock.mockClear()
    render(
      <BrowserRouter>
        <IssueList
          {...defaultProps}
          viewMode="list"
          issues={[{ ...mockIssues[0], issue_identifier: 'ISS-0001' }]}
        />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByLabelText('View issue'))
    expect(navigateMock).toHaveBeenCalledWith('/platform/projects/PRJ-SEED/issues/ISS-0001')
  })

  it('list view shows Updated by column with updater name', () => {
    render(
      <BrowserRouter>
        <IssueList
          {...defaultProps}
          viewMode="list"
          issues={[
            {
              ...mockIssues[0],
              updated_by_user: { full_name: 'Oscar Mbira', email: 'oscar@example.com' },
            },
          ]}
        />
      </BrowserRouter>
    )
    expect(screen.getByText('Updated by')).toBeInTheDocument()
    expect(screen.getByText('Oscar Mbira')).toBeInTheDocument()
  })

  it('getIssueAgeDays prefers date_raised over created_at', () => {
    expect(getIssueAgeDays({ date_raised: '2026-07-20', created_at: '2026-01-01T00:00:00Z' })).toBe(
      getIssueAgeDays({ date_raised: '2026-07-20' })
    )
  })

  it('isIssueDueOverdue is true for open issues past due_date', () => {
    expect(isIssueDueOverdue({ due_date: '2020-01-01', status: 'new' })).toBe(true)
    expect(isIssueDueOverdue({ due_date: '2020-01-01', status: 'closed' })).toBe(false)
    expect(isIssueDueOverdue({ due_date: null, status: 'new' })).toBe(false)
  })
})
