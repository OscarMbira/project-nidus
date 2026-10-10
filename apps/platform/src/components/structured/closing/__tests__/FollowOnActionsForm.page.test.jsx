import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FollowOnActionsForm from '../FollowOnActionsForm'
import { supabase } from '../../../../services/supabaseClient'
import { updateFollowOnAction } from '../../../../services/closingProjectService'

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

vi.mock('../../../../services/closingProjectService', () => ({
  createFollowOnAction: vi.fn(),
  updateFollowOnAction: vi.fn(),
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.() }),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn() },
}))

const action = {
  id: 'a1',
  action_title: 'Archive the signed acceptance pack',
  action_description: 'File the signed pack.\nSend the scan to operations.',
  action_category: 'documentation',
  priority: 'low',
  status: 'in-progress',
  assigned_to_user_id: '',
  recommended_completion_date: '2026-10-25',
}

describe('FollowOnActionsForm', () => {
  it('saves updated_by as the users row, not the sign-in id', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } } })
    supabase.from.mockImplementation(() => {
      const filters = {}
      const api = {
        select: () => api,
        eq: (column, value) => {
          filters[column] = value
          return api
        },
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({
          data: filters.auth_user_id ? { id: 'user-row-1' } : null,
          error: null,
        }),
      }
      return api
    })
    updateFollowOnAction.mockResolvedValue({ id: 'a1', action_title: action.action_title })

    render(<FollowOnActionsForm projectId="project-1" action={action} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Update Action' }))

    await waitFor(() => expect(updateFollowOnAction).toHaveBeenCalled())
    const payload = updateFollowOnAction.mock.calls[0][1]
    expect(payload.updated_by).toBe('user-row-1')
    expect(payload.action_description_items).toEqual([
      { description: 'File the signed pack.', target_date: null },
      { description: 'Send the scan to operations.', target_date: null },
    ])
  })

  it('renders as a page with action description last and multi-value', () => {
    supabase.from.mockImplementation(() => {
      const api = {
        select: () => api,
        eq: () => api,
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }
      return api
    })
    const { container } = render(
      <FollowOnActionsForm projectId="project-1" action={action} onClose={() => {}} />
    )

    expect(screen.getByRole('heading', { name: 'Edit Follow-on Action' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelector('.fixed.inset-0')).toBeNull()
    expect(screen.getByText('File the signed pack.')).toBeInTheDocument()
    expect(screen.getByText('Send the scan to operations.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table list view' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Target date' })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Target date for action description/)).toHaveLength(2)

    const description = screen.getByText('Action Description *')
    const assigned = screen.getByText('Assigned To')
    const due = screen.getByText('Target Completion Date')
    expect(assigned.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(due.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
