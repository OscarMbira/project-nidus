import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DefectCommentSection from '../DefectCommentSection'
import toast from 'react-hot-toast'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

describe('DefectCommentSection', () => {
  let getComments
  let addComment

  beforeEach(() => {
    vi.clearAllMocks()
    getComments = vi.fn().mockResolvedValue([])
    addComment = vi.fn().mockResolvedValue({})
  })

  it('confirms the comment was saved with a success toast', async () => {
    render(
      <DefectCommentSection
        defectId="def-1"
        currentUserId="user-1"
        getComments={getComments}
        addComment={addComment}
      />,
    )
    await waitFor(() => expect(getComments).toHaveBeenCalledWith('def-1'))

    fireEvent.change(screen.getByPlaceholderText('Add a comment…'), { target: { value: 'Looks fixed now' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect(addComment).toHaveBeenCalledWith('def-1', { comment: 'Looks fixed now', created_by: 'user-1' }))
    expect(toast.success).toHaveBeenCalled()
    // The box clears once posted.
    expect(screen.getByPlaceholderText('Add a comment…')).toHaveValue('')
  })

  it('shows a toast when the comment fails to save', async () => {
    addComment.mockRejectedValueOnce(new Error('network error'))
    render(
      <DefectCommentSection
        defectId="def-1"
        currentUserId="user-1"
        getComments={getComments}
        addComment={addComment}
      />,
    )
    await waitFor(() => expect(getComments).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText('Add a comment…'), { target: { value: 'Looks fixed now' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // The text stays so the user doesn't lose what they typed.
    expect(screen.getByPlaceholderText('Add a comment…')).toHaveValue('Looks fixed now')
  })
})
