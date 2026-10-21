// v1290 — the meeting review page only lets people whose role may use Pending AI Reviews file items.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const canFile = vi.fn()
const stagedRow = { id: 'r1', meeting_id: 'm1', project_id: 'p1', ai_extracted_title: 'Steel delivery is late', status: 'pending_review' }

vi.mock('../../../services/communications/meetingFilingService', () => ({
  canFileMeetingItems: (...a) => canFile(...a),
  defaultChoice: () => 'create',
  FILING_KINDS: [
    { kind: 'action', label: 'Actions', recordLabel: 'action' },
    { kind: 'risk', label: 'Risks', recordLabel: 'risk' },
    { kind: 'issue', label: 'Issues', recordLabel: 'issue' },
    { kind: 'decision', label: 'Decisions', recordLabel: 'decision' },
  ],
  fileMeetingItem: vi.fn(),
  filingSummary: vi.fn(),
  isHandled: () => false,
  itemTitle: (_k, row) => row.ai_extracted_title,
  loadStagedItems: () => Promise.resolve({ action: [], risk: [stagedRow], issue: [], decision: [] }),
  runMeetingRegisterAgent: vi.fn(),
}))
vi.mock('../useIsSimulator', () => ({ useIsSimulator: () => false }))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({ useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }) }))
vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({ useUnsavedChangesGuard: () => {} }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))

function query(result) {
  const q = { select: () => q, eq: () => q, order: () => q, limit: () => Promise.resolve(result), maybeSingle: () => Promise.resolve(result) }
  return q
}
const fakeDb = {
  from: (name) => (name === 'comm_meetings'
    ? query({ data: { id: 'm1', title: 'Weekly', project_id: 'p1' }, error: null })
    : query({ data: [{ id: 't1' }], error: null })),
}
vi.mock('@nidus/supabase', () => ({ platformDb: fakeDb, simDb: fakeDb }))

const { default: MeetingExtractionReview } = await import('../MeetingExtractionReview')

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/comms/review/m1']}>
      <Routes><Route path="/comms/review/:meetingId" element={<MeetingExtractionReview />} /></Routes>
    </MemoryRouter>,
  )
}

describe('MeetingExtractionReview filing permission (v1290)', () => {
  beforeEach(() => canFile.mockReset())

  it('is view-only when the role cannot use Pending AI Reviews', async () => {
    canFile.mockResolvedValue(false)
    renderPage()
    expect(await screen.findByText(/your role cannot file them to the registers/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Steel delivery is late')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /file selected items/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ai suggestions|file to registers with ai/i })).not.toBeInTheDocument()
  })

  it('shows the filing controls when the role may use Pending AI Reviews', async () => {
    canFile.mockResolvedValue(true)
    renderPage()
    expect(await screen.findByRole('button', { name: /file selected items/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh ai suggestions/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('Steel delivery is late')).not.toBeDisabled())
    expect(screen.queryByText(/your role cannot file them/i)).not.toBeInTheDocument()
  })
})
