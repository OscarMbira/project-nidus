import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TestCaseDetail from '../TestCaseDetail'
import { getTestCaseById } from '../../../services/testCaseService'

vi.mock('../../../components/testing/TestingPageShell', () => ({
  default: ({ children }) => <div>{children({ projectId: 'proj-1' })}</div>,
}))

vi.mock('../../../services/testCaseService', () => ({
  getTestCaseById: vi.fn(),
  updateTestCase: vi.fn(),
}))

vi.mock('../../../services/testSuiteService', () => ({
  getTestSuiteOptions: vi.fn().mockResolvedValue([]),
}))

vi.mock('@nidus/ui/RecordPreviewModal', () => ({
  default: ({ isOpen, baseFilename }) =>
    isOpen ? <div role="dialog" data-filename={baseFilename}>Preview</div> : null,
}))

describe('TestCaseDetail View action (PRD v1204, Slice 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTestCaseById.mockResolvedValue({
      id: 'tc-1',
      test_case_ref: 'TC-001',
      title: 'Login works',
      steps: [],
      project_id: 'proj-1',
    })
  })

  it('shows an icon-only View button that opens the shared record preview', async () => {
    render(
      <MemoryRouter initialEntries={['/platform/testing/cases/tc-1']}>
        <Routes>
          <Route path="/platform/testing/cases/:caseId" element={<TestCaseDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    const viewBtn = await screen.findByRole('button', { name: 'View test case' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(viewBtn)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-filename', 'test_case_TC-001')
  })
})
