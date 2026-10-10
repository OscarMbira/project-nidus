import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DefectDetail from '../DefectDetail'
import { getDefectById } from '../../../services/defectService'

vi.mock('../../../components/testing/TestingPageShell', () => ({
  default: ({ children }) => <div>{children({ projectId: 'proj-1' })}</div>,
}))

vi.mock('../../../services/defectService', () => ({
  getDefectById: vi.fn(),
  createDefect: vi.fn(),
  updateDefect: vi.fn(),
}))

vi.mock('@nidus/shared/utils/resolveInternalUserId', () => ({
  resolveInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

vi.mock('../../../components/testing/DefectCommentSection', () => ({
  default: () => <div data-testid="comments-marker">Comments section</div>,
}))

vi.mock('../../../components/testing/DefectAttachmentUploader', () => ({
  default: () => <div data-testid="images-marker">Images uploader</div>,
}))

const row = {
  id: 'def-1',
  project_id: 'proj-1',
  defect_ref: 'DEF-0001',
  title: 'Something broke',
  description: 'It broke.',
  status: 'open',
  severity: 'medium',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/platform/testing/defects/def-1']}>
      <Routes>
        <Route path="/platform/testing/defects/:defectId" element={<DefectDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DefectDetail — Images moved to its own tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDefectById.mockResolvedValue(row)
  })

  it('shows an Images tab alongside Details and Audit details', async () => {
    renderPage()
    await screen.findByText('Something broke')

    expect(screen.getByRole('tab', { name: 'Images' })).toBeInTheDocument()
  })

  it('keeps Comments on the Details tab and hides the image uploader there', async () => {
    renderPage()
    await screen.findByText('Something broke')

    expect(screen.getByTestId('comments-marker')).toBeInTheDocument()
    expect(screen.queryByTestId('images-marker')).toBeNull()
  })

  it('shows the image uploader (and not Comments) on the Images tab', async () => {
    renderPage()
    await screen.findByText('Something broke')

    fireEvent.click(screen.getByRole('tab', { name: 'Images' }))

    await waitFor(() => expect(screen.getByTestId('images-marker')).toBeInTheDocument())
    expect(screen.queryByTestId('comments-marker')).toBeNull()
  })
})
