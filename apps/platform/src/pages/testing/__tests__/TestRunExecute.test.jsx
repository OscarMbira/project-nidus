import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TestRunExecute from '../TestRunExecute'
import { getTestRunById, getExecutionsByRun, updateExecution } from '../../../services/testRunService'
import {
  listEvidenceForRun,
  uploadExecutionEvidence,
  softDeleteExecutionEvidence,
  getEvidenceRequirementSettings,
} from '../../../services/testCaseExecutionEvidenceService'
import toast from 'react-hot-toast'

vi.mock('../../../components/testing/TestingPageShell', () => ({
  default: ({ children }) => <div>{children({ projectId: 'proj-1' })}</div>,
}))

vi.mock('../../../services/testRunService', () => ({
  getTestRunById: vi.fn(),
  getExecutionsByRun: vi.fn(),
  updateExecution: vi.fn(),
}))

vi.mock('../../../services/testCaseExecutionEvidenceService', () => ({
  listEvidenceForRun: vi.fn(),
  uploadExecutionEvidence: vi.fn(),
  softDeleteExecutionEvidence: vi.fn(),
  getEvidenceRequirementSettings: vi.fn().mockResolvedValue({ projectValue: null, accountDefault: null }),
}))

vi.mock('../../../hooks/useProjectRole', () => ({
  useProjectRole: () => ({ canEdit: false }),
}))

vi.mock('@nidus/shared/utils/resolveInternalUserId', () => ({
  resolveInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const run = { id: 'run-1', project_id: 'proj-1', status: 'in_progress', summary: {} }
const execution = {
  id: 'exec-1',
  status: 'pending',
  notes: '',
  test_cases: { test_case_ref: 'TC-001', title: 'Login works' },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/platform/testing/runs/run-1/execute']}>
      <Routes>
        <Route path="/platform/testing/runs/:runId/execute" element={<TestRunExecute />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TestRunExecute — save confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTestRunById.mockResolvedValue(run)
    getExecutionsByRun.mockResolvedValue([execution])
    listEvidenceForRun.mockResolvedValue([])
    updateExecution.mockResolvedValue({ id: 'exec-1', status: 'passed' })
    uploadExecutionEvidence.mockResolvedValue({})
    softDeleteExecutionEvidence.mockResolvedValue({})
  })

  it('confirms a status change with a toast naming the new status', async () => {
    renderPage()
    await screen.findByText('Login works')

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    await waitFor(() => expect(updateExecution).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/passed/i)))
  })

  it('shows a toast when saving a status change fails', async () => {
    updateExecution.mockRejectedValueOnce(new Error('network error'))
    renderPage()
    await screen.findByText('Login works')

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('confirms evidence attach with a toast', async () => {
    renderPage()
    await screen.findByText('Login works')
    const input = document.querySelector('input[type="file"]')
    const file = new File(['a'], 'a.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(uploadExecutionEvidence).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('shows a toast when evidence attach fails', async () => {
    uploadExecutionEvidence.mockRejectedValueOnce(new Error('network error'))
    renderPage()
    await screen.findByText('Login works')
    const input = document.querySelector('input[type="file"]')
    const file = new File(['a'], 'a.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('confirms evidence removal with a toast', async () => {
    listEvidenceForRun.mockResolvedValue([
      { id: 'ev-1', test_case_execution_id: 'exec-1', file_name: 'a.png', uploaded_by: 'user-1' },
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('a.png')

    fireEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))

    await waitFor(() => expect(softDeleteExecutionEvidence).toHaveBeenCalledWith('ev-1'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('shows a toast when evidence removal fails', async () => {
    listEvidenceForRun.mockResolvedValue([
      { id: 'ev-1', test_case_execution_id: 'exec-1', file_name: 'a.png', uploaded_by: 'user-1' },
    ])
    softDeleteExecutionEvidence.mockRejectedValueOnce(new Error('network error'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('a.png')

    fireEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('saves notes on blur even when the status is not changed, and confirms with a toast', async () => {
    renderPage()
    await screen.findByText('Login works')
    const textarea = screen.getByPlaceholderText('Notes / actual result…')

    fireEvent.change(textarea, { target: { value: 'Observed a minor delay.' } })
    fireEvent.blur(textarea)

    await waitFor(() =>
      expect(updateExecution).toHaveBeenCalledWith('exec-1', expect.objectContaining({ notes: 'Observed a minor delay.' })),
    )
    const [, updateArg] = updateExecution.mock.calls[0]
    expect(updateArg.status).toBeUndefined()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/notes saved/i)))
  })

  it('does not save on blur when the notes have not changed', async () => {
    renderPage()
    await screen.findByText('Login works')
    const textarea = screen.getByPlaceholderText('Notes / actual result…')

    fireEvent.blur(textarea)

    await new Promise((r) => setTimeout(r, 0))
    expect(updateExecution).not.toHaveBeenCalled()
  })
})
