import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SimTestRunExecute from '../SimTestRunExecute'
import {
  getPracticeTestRunById,
  getPracticeExecutionsByRun,
  updatePracticeExecution,
} from '../../../../services/sim/practiceTestRunService'
import {
  listEvidenceForRun,
  uploadPracticeExecutionEvidence,
  softDeletePracticeExecutionEvidence,
  getPracticeEvidenceRequirementSettings,
} from '../../../../services/sim/practiceTestCaseExecutionEvidenceService'
import toast from 'react-hot-toast'

vi.mock('../../../../components/sim/SimTestingPageShell', () => ({
  default: ({ children }) => <div>{children({ projectId: 'pp-1' })}</div>,
}))

vi.mock('../../../../services/sim/practiceTestRunService', () => ({
  getPracticeTestRunById: vi.fn(),
  getPracticeExecutionsByRun: vi.fn(),
  updatePracticeExecution: vi.fn(),
}))

vi.mock('../../../../services/sim/practiceTestCaseExecutionEvidenceService', () => ({
  listEvidenceForRun: vi.fn(),
  uploadPracticeExecutionEvidence: vi.fn(),
  softDeletePracticeExecutionEvidence: vi.fn(),
  getPracticeEvidenceRequirementSettings: vi.fn().mockResolvedValue({ projectValue: null, accountDefault: null, ownerUserId: null }),
}))

vi.mock('../../../../utils/resolveSimInternalUserId', () => ({
  resolveSimInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const run = { id: 'run-1', practice_project_id: 'pp-1', status: 'in_progress', summary: {} }
const execution = {
  id: 'exec-1',
  status: 'pending',
  notes: '',
  test_cases: { test_case_ref: 'TC-001', title: 'Login works' },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/simulator/practice-testing/runs/run-1/execute']}>
      <Routes>
        <Route path="/simulator/practice-testing/runs/:runId/execute" element={<SimTestRunExecute />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SimTestRunExecute — save confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPracticeTestRunById.mockResolvedValue(run)
    getPracticeExecutionsByRun.mockResolvedValue([execution])
    listEvidenceForRun.mockResolvedValue([])
    updatePracticeExecution.mockResolvedValue({ id: 'exec-1', status: 'passed' })
    uploadPracticeExecutionEvidence.mockResolvedValue({})
    softDeletePracticeExecutionEvidence.mockResolvedValue({})
  })

  it('confirms a status change with a toast naming the new status', async () => {
    renderPage()
    await screen.findByText('Login works')

    fireEvent.click(screen.getByRole('button', { name: 'passed' }))

    await waitFor(() => expect(updatePracticeExecution).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/passed/i)))
  })

  it('shows a toast when saving a status change fails', async () => {
    updatePracticeExecution.mockRejectedValueOnce(new Error('network error'))
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

    await waitFor(() => expect(uploadPracticeExecutionEvidence).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('shows a toast when evidence attach fails', async () => {
    uploadPracticeExecutionEvidence.mockRejectedValueOnce(new Error('network error'))
    renderPage()
    await screen.findByText('Login works')
    const input = document.querySelector('input[type="file"]')
    const file = new File(['a'], 'a.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('confirms evidence removal with a toast', async () => {
    listEvidenceForRun.mockResolvedValue([
      { id: 'ev-1', practice_test_case_execution_id: 'exec-1', file_name: 'a.png', uploaded_by: 'user-1' },
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('a.png')

    fireEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))

    await waitFor(() => expect(softDeletePracticeExecutionEvidence).toHaveBeenCalledWith('ev-1'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('shows a toast when evidence removal fails', async () => {
    listEvidenceForRun.mockResolvedValue([
      { id: 'ev-1', practice_test_case_execution_id: 'exec-1', file_name: 'a.png', uploaded_by: 'user-1' },
    ])
    softDeletePracticeExecutionEvidence.mockRejectedValueOnce(new Error('network error'))
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
      expect(updatePracticeExecution).toHaveBeenCalledWith('exec-1', expect.objectContaining({ notes: 'Observed a minor delay.' })),
    )
    const [, updateArg] = updatePracticeExecution.mock.calls[0]
    expect(updateArg.status).toBeUndefined()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/notes saved/i)))
  })
})
