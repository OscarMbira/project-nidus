import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import IssueForm from '../IssueForm.jsx'

// IssueForm previously used a native, unstyled window.alert() for save confirmation
// (v861 fix, PRD D5) — this test guards that a proper modal now appears instead, and
// that onSave() only fires after OK is clicked (matching the alert()'s prior blocking
// behavior, just via the shared component instead of a native dialog).

function chainable(result) {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') return (resolve) => resolve(result)
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-user-1' } } }) },
    from: vi.fn((table) => {
      if (table === 'users') return chainable({ data: { id: 'app-user-1' }, error: null })
      return chainable({ data: [], error: null })
    }),
  },
}))

vi.mock('../../services/issueRegisterService', () => ({
  getOrCreateIssueRegister: vi.fn().mockResolvedValue({ id: 'register-1' }),
}))

const createIssueMock = vi.fn().mockResolvedValue({ id: 'issue-1', issue_identifier: 'ISSUE-2026-014' })
vi.mock('../../services/issueService', () => ({
  createIssue: (...args) => createIssueMock(...args),
  updateIssue: vi.fn().mockResolvedValue({ id: 'issue-1', issue_identifier: 'ISSUE-2026-014' }),
}))

const validateIssueFormMock = vi.fn(() => ({ valid: true, errors: {} }))
vi.mock('@nidus/shared/utils/issueValidation', () => ({
  validateIssueForm: (...args) => validateIssueFormMock(...args),
  validateStatusTransition: vi.fn(() => ({ valid: true, message: '' })),
}))

describe('IssueForm — success confirmation (v861)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a success modal on create instead of alert(), and only calls onSave after OK', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onSave = vi.fn()
    const { container } = render(
      <IssueForm issue={null} projectId="project-1" onSave={onSave} onCancel={() => {}} />,
    )

    // date_raised is auto-filled to today on mount for a new issue; issue_title,
    // issue_description, and impact_description are `required` and must be filled or
    // jsdom's native constraint validation silently blocks the submit event.
    fireEvent.change(container.querySelector('[name="issue_title"]'), { target: { value: 'Server outage' } })
    fireEvent.change(container.querySelector('[name="issue_description"]'), {
      target: { value: 'Production server unresponsive since 09:00.' },
    })
    fireEvent.change(container.querySelector('[name="impact_description"]'), {
      target: { value: 'Customers cannot place orders.' },
    })
    const btn = screen.getByRole('button', { name: /Create Issue/i })
    // fireEvent.click on the submit button doesn't reliably trigger the form's onSubmit
    // under jsdom here — submit the form directly instead (same effect, more robust).
    fireEvent.submit(btn.closest('form'))

    await waitFor(() => expect(createIssueMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('ISSUE-2026-014')).toBeInTheDocument())
    expect(alertSpy).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('exposes Details / Ownership / Impact / Links / Audit details tabs', () => {
    render(<IssueForm issue={null} projectId="project-1" onSave={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ownership' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Impact' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Links' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audit details' })).toBeInTheDocument()
  })

  it('shows audit empty state on create and audit cards when editing', async () => {
    const { rerender } = render(
      <IssueForm issue={null} projectId="project-1" onSave={() => {}} onCancel={() => {}} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(screen.getByText(/Audit details appear after this issue is saved/i)).toBeInTheDocument()

    rerender(
      <IssueForm
        issue={{
          id: 'issue-1',
          issue_identifier: 'ISS-0001',
          issue_title: 'Scope clarification needed',
          issue_type: 'problem_concern',
          status: 'new',
          priority: 'high',
          severity: 'minor',
          record_status: 'live',
          created_by: 'app-user-1',
          updated_by: 'app-user-1',
          created_at: '2026-07-29T10:00:00Z',
          updated_at: '2026-08-07T12:00:00Z',
          date_raised: '2026-07-29',
        }}
        projectId="project-1"
        onSave={() => {}}
        onCancel={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    await waitFor(() => expect(screen.getByText('Identity')).toBeInTheDocument())
    expect(screen.getByText('ISS-0001')).toBeInTheDocument()
    expect(screen.getByText('Record history')).toBeInTheDocument()
  })

  it('shows an inline guidance banner instead of alert() when validation fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    validateIssueFormMock.mockReturnValueOnce({
      valid: false,
      errors: { impact_description: 'Please describe the impact of this issue' },
    })

    const { container } = render(
      <IssueForm issue={null} projectId="project-1" onSave={() => {}} onCancel={() => {}} />,
    )

    fireEvent.change(container.querySelector('[name="issue_title"]'), {
      target: { value: 'Server outage affecting checkout' },
    })
    fireEvent.change(container.querySelector('[name="issue_description"]'), {
      target: { value: 'Production server unresponsive since 09:00 and customers cannot place orders.' },
    })
    fireEvent.submit(container.querySelector('form'))

    await waitFor(() =>
      expect(screen.getByText(/One field still needs attention before you can save/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/open the Impact tab to fix it/i)).toBeInTheDocument()
    expect(alertSpy).not.toHaveBeenCalled()
    expect(createIssueMock).not.toHaveBeenCalled()
  })
})
