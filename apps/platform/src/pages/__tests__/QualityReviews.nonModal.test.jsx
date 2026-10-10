import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QualityReviews from '../QualityReviews'
import { getQualityReviews } from '../../services/qualityManagementService'

vi.mock('../../services/qualityManagementService', () => ({
  getQualityReviews: vi.fn(),
  deleteQualityReview: vi.fn(),
}))

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  },
}))

const reviews = [
  { id: 'rev-1', review_title: 'Design Peer Review', review_reference: 'QR-001', review_status: 'planned' },
]

vi.mock('../../components/quality/QualityReviewForm', () => ({
  default: ({ variant, onCancel }) => (
    <div role="dialog" data-variant={variant}>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <QualityReviews />
    </MemoryRouter>,
  )
}

describe('QualityReviews — Create/Edit form is non-modal (in-page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getQualityReviews.mockResolvedValue(reviews)
  })

  it('opens the form in-page (variant="page"), not as a modal', async () => {
    renderPage()
    await screen.findByText('Design Peer Review')

    fireEvent.click(screen.getByRole('button', { name: /create review/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-variant', 'page')
  })

  it('hides the review list while the in-page form is open', async () => {
    renderPage()
    await screen.findByText('Design Peer Review')

    fireEvent.click(screen.getByRole('button', { name: /create review/i }))
    await screen.findByRole('dialog')

    expect(screen.queryByText('Design Peer Review')).toBeNull()
  })

  it('shows the list again after cancelling', async () => {
    renderPage()
    await screen.findByText('Design Peer Review')
    fireEvent.click(screen.getByRole('button', { name: /create review/i }))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('Design Peer Review')).toBeInTheDocument()
  })
})
