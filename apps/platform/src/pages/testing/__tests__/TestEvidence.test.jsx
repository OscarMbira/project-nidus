import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestEvidence from '../TestEvidence'
import {
  listEvidenceForProject,
  getEvidenceSignedUrl,
  softDeleteExecutionEvidence,
} from '../../../services/testCaseExecutionEvidenceService'
import toast from 'react-hot-toast'

vi.mock('../../../components/testing/TestingPageShell', () => ({
  default: ({ children }) => <div>{children({ projectId: 'proj-1' })}</div>,
}))

vi.mock('../../../services/testCaseExecutionEvidenceService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    listEvidenceForProject: vi.fn(),
    getEvidenceSignedUrl: vi.fn().mockResolvedValue('https://files.example/signed'),
    softDeleteExecutionEvidence: vi.fn().mockResolvedValue({}),
  }
})

vi.mock('../../../hooks/useProjectRole', () => ({
  useProjectRole: vi.fn(() => ({ canEdit: false })),
}))

vi.mock('@nidus/shared/utils/resolveInternalUserId', () => ({
  resolveInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const rows = [
  {
    id: 'ev-pass',
    file_name: 'Login_passed.png',
    mime_type: 'image/png',
    created_at: '2026-10-04T10:00:00Z',
    storage_path: 'executions/e1/login.png',
    uploaded_by: 'user-1',
    uploader: { full_name: 'Tester One' },
    run: { run_name: 'Sprint 3', status: 'in_progress' },
    execution: {
      status: 'passed',
      test_case: { test_case_ref: 'TC-001', title: 'Login works' },
      defect: null,
    },
  },
  {
    id: 'ev-fail',
    file_name: 'Checkout_failed.png',
    mime_type: 'image/png',
    created_at: '2026-10-03T10:00:00Z',
    storage_path: 'executions/e2/checkout.png',
    uploaded_by: 'user-2',
    uploader: { full_name: 'Tester Two' },
    run: { run_name: 'Sprint 3', status: 'completed' },
    execution: {
      status: 'failed',
      test_case: { test_case_ref: 'TC-002', title: 'Checkout total' },
      defect: { id: 'def-9', defect_ref: 'DEF-0009' },
    },
  },
  {
    id: 'ev-csv',
    file_name: 'malformed-rows-sample.csv',
    mime_type: 'text/csv',
    created_at: '2026-10-02T10:00:00Z',
    storage_path: 'executions/e3/sample.csv',
    uploaded_by: 'user-1',
    uploader: { full_name: 'Tester One' },
    run: { run_name: 'Sprint 3', status: 'in_progress' },
    execution: {
      status: 'passed',
      test_case: { test_case_ref: 'TC-003', title: 'CSV import' },
      defect: null,
    },
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <TestEvidence />
    </MemoryRouter>,
  )
}

describe('TestEvidence page (PRD v1204, Slice 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEvidenceForProject.mockResolvedValue(rows)
  })

  it('shows only passed-test evidence by default', async () => {
    renderPage()

    expect(await screen.findByText('Login_passed.png')).toBeInTheDocument()
    expect(screen.queryByText('Checkout_failed.png')).toBeNull()
  })

  it('finds a failed-result file by search even while the Passed filter is still selected', async () => {
    renderPage()
    await screen.findByText('Login_passed.png')

    fireEvent.change(screen.getByPlaceholderText('Search file, test case, run or defect…'), {
      target: { value: 'DEF-0009' },
    })

    expect(await screen.findByText('Checkout_failed.png')).toBeInTheDocument()
    // The Passed pill stays visually selected — search widened the scope, not the filter choice.
    expect(screen.getByRole('button', { name: 'Passed' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Searching across all outcomes/i)).toBeInTheDocument()
  })

  it('switches to failed results and links the row to its defect', async () => {
    renderPage()
    await screen.findByText('Login_passed.png')

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))

    expect(await screen.findByText('Checkout_failed.png')).toBeInTheDocument()
    expect(screen.queryByText('Login_passed.png')).toBeNull()
    const link = screen.getByRole('link', { name: 'DEF-0009' })
    expect(link).toHaveAttribute('href', '/platform/testing/defects/def-9')
  })

  it('does not list defect attachments; only test-result evidence is requested', async () => {
    renderPage()
    await waitFor(() => expect(listEvidenceForProject).toHaveBeenCalledWith('proj-1'))
    expect(screen.queryByText('Screenshots')).toBeNull()
    expect(screen.queryByText('History')).toBeNull()
  })

  it('opens the file via a signed URL from the View action', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    renderPage()
    await screen.findByText('Login_passed.png')

    fireEvent.click(screen.getByRole('button', { name: 'View Login_passed.png' }))

    await waitFor(() => expect(getEvidenceSignedUrl).toHaveBeenCalledWith('executions/e1/login.png'))
    expect(openSpy).toHaveBeenCalledWith('https://files.example/signed', '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('opens a text-based file (csv, log) as plain text instead of letting the browser download it', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      text: () => Promise.resolve('row,reason\n1,"bad row"\n'),
    })
    const createObjectURLSpy = vi.fn(() => 'blob:mock-text-view')
    global.URL.createObjectURL = createObjectURLSpy
    renderPage()
    await screen.findByText('malformed-rows-sample.csv')

    fireEvent.click(screen.getByRole('button', { name: 'View malformed-rows-sample.csv' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('https://files.example/signed'))
    expect(createObjectURLSpy).toHaveBeenCalled()
    const blobArg = createObjectURLSpy.mock.calls[0][0]
    expect(blobArg.type).toBe('text/plain')
    expect(openSpy).toHaveBeenCalledWith('blob:mock-text-view', '_blank', 'noopener')
    // Never hands the browser the raw signed URL directly for this type — that's what downloads it.
    expect(openSpy).not.toHaveBeenCalledWith('https://files.example/signed', '_blank', 'noopener')

    fetchSpy.mockRestore()
    openSpy.mockRestore()
  })

  it('shows Remove only for a file the viewer may remove, and removes it on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('Login_passed.png')

    // Uploaded by the current user (user-1) on an open run: removable.
    const removeBtn = screen.getByRole('button', { name: 'Remove Login_passed.png' })
    fireEvent.click(removeBtn)

    await waitFor(() => expect(softDeleteExecutionEvidence).toHaveBeenCalledWith('ev-pass'))
    await waitFor(() => expect(listEvidenceForProject).toHaveBeenCalledTimes(2))
    confirmSpy.mockRestore()
  })

  it('shows a toast and does not open a window when the file has no real storage object', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    getEvidenceSignedUrl.mockRejectedValueOnce(new Error('Object not found'))
    renderPage()
    await screen.findByText('Login_passed.png')

    fireEvent.click(screen.getByRole('button', { name: 'View Login_passed.png' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('shows a toast when removing a file fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    softDeleteExecutionEvidence.mockRejectedValueOnce(new Error('network error'))
    renderPage()
    await screen.findByText('Login_passed.png')

    fireEvent.click(screen.getByRole('button', { name: 'Remove Login_passed.png' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('hides Remove for a file uploaded by someone else on a closed run', async () => {
    renderPage()
    await screen.findByText('Login_passed.png')
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    await screen.findByText('Checkout_failed.png')

    // Uploaded by user-2, run completed, viewer is not a Project Manager.
    expect(screen.queryByRole('button', { name: 'Remove Checkout_failed.png' })).toBeNull()
  })
})
