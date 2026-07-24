import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import IssueList from '../IssueList'

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

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
})

