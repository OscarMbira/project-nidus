import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QualityReviewForm from '../QualityReviewForm'

vi.mock('../../../services/qualityManagementService', () => ({
  saveQualityReview: vi.fn(),
}))

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
  simDb: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
}))

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn().mockResolvedValue(null),
}))

const review = {
  id: 'rev-1',
  review_reference: 'QR-001',
  review_title: 'Design Peer Review',
  review_type: 'peer-review',
  review_criteria: 'First criterion line.\nSecond criterion line.',
  pre_review_checklist: 'First checklist item.\nSecond checklist item.',
}

function renderForm() {
  return render(
    <QualityReviewForm review={review} projectId="proj-1" onSave={vi.fn()} onCancel={vi.fn()} variant="page" />,
  )
}

describe('QualityReviewForm (Simulator) — Schedule & Location, Review Team, and Review Criteria get their own tabs', () => {
  it('shows Details, Schedule & Location, Review Team, Review Criteria, Review Settings, Pre-Review Checklist, Notes and Audit details as separate tabs', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Schedule & Location' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Review Team' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Review Criteria' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Review Settings' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pre-Review Checklist' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audit details' })).toBeInTheDocument()
  })

  it('shows only Schedule & Location fields on that tab', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Schedule & Location' }))

    expect(await screen.findByText('Planned Date')).toBeInTheDocument()
    expect(screen.queryByText('Review Chair')).toBeNull()
    expect(screen.queryByText('First criterion line.')).toBeNull()
  })

  it('shows only Review Team fields on that tab', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Review Team' }))

    expect(await screen.findByText('Review Chair')).toBeInTheDocument()
    expect(screen.queryByText('Planned Date')).toBeNull()
  })

  it('shows only Review Criteria as a multi-value list on its own tab', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Review Criteria' }))

    expect(await screen.findByText('First criterion line.')).toBeInTheDocument()
    expect(screen.getByText('Second criterion line.')).toBeInTheDocument()
    expect(screen.queryByText('First checklist item.')).toBeNull()
  })

  it('shows only Pre-Review Checklist as a multi-value list on its own tab', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Pre-Review Checklist' }))

    expect(await screen.findByText('First checklist item.')).toBeInTheDocument()
    expect(screen.getByText('Second checklist item.')).toBeInTheDocument()
    expect(screen.queryByText('First criterion line.')).toBeNull()
  })

  it('shows only Notes field on that tab', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Design Peer Review')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }))

    expect(await screen.findByPlaceholderText('Additional notes...')).toBeInTheDocument()
    expect(screen.queryByText('Review Chair')).toBeNull()
    expect(screen.queryByText('First criterion line.')).toBeNull()
  })
})
