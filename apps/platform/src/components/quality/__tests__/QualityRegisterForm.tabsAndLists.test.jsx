import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QualityRegisterForm from '../QualityRegisterForm'

vi.mock('../../../services/qualityManagementService', () => ({
  saveQualityRegisterItem: vi.fn(),
}))

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
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
}))

const item = {
  id: 'qr-1',
  product_reference: 'QR-002',
  product_name: 'Business Requirements Specification',
  quality_method: 'review',
  quality_responsibilities: 'First responsibility line.\nSecond responsibility line.',
  quality_criteria: 'First criterion.\nSecond criterion.',
  acceptance_criteria: 'First acceptance item.\nSecond acceptance item.',
}

function renderForm() {
  return render(
    <QualityRegisterForm item={item} projectId="proj-1" onSave={vi.fn()} onCancel={vi.fn()} variant="page" />,
  )
}

describe('QualityRegisterForm — each field gets its own tab, not grouped together', () => {
  it('shows Quality Method, Quality Responsibilities, Quality Criteria and Acceptance Criteria as four separate tabs', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Business Requirements Specification')).toBeInTheDocument())

    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quality Method' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quality Responsibilities' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quality Criteria' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Acceptance Criteria' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Schedule & Sign-off' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audit details' })).toBeInTheDocument()
    // No bundled "Quality Information" tab anymore.
    expect(screen.queryByRole('tab', { name: 'Quality Information' })).toBeNull()
  })

  it('shows only the Quality Method field on its own tab — not Responsibilities/Criteria alongside it', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Business Requirements Specification')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Quality Method' }))

    expect(await screen.findByText('Quality Owner')).toBeInTheDocument()
    expect(screen.queryByText('First responsibility line.')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Quality Criteria' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Acceptance Criteria' })).toBeNull()
  })

  it('shows only Quality Responsibilities on its own tab, as separate list items', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Business Requirements Specification')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Quality Responsibilities' }))

    expect(await screen.findByText('First responsibility line.')).toBeInTheDocument()
    expect(screen.getByText('Second responsibility line.')).toBeInTheDocument()
    expect(screen.queryByText('First criterion.')).toBeNull()
    expect(screen.queryByText('First acceptance item.')).toBeNull()
  })

  it('shows only Quality Criteria on its own tab, as separate list items', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Business Requirements Specification')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Quality Criteria' }))

    expect(await screen.findByText('First criterion.')).toBeInTheDocument()
    expect(screen.getByText('Second criterion.')).toBeInTheDocument()
    expect(screen.queryByText('First responsibility line.')).toBeNull()
    expect(screen.queryByText('First acceptance item.')).toBeNull()
  })

  it('shows only Acceptance Criteria on its own tab, as separate list items', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByDisplayValue('Business Requirements Specification')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Acceptance Criteria' }))

    expect(await screen.findByText('First acceptance item.')).toBeInTheDocument()
    expect(screen.getByText('Second acceptance item.')).toBeInTheDocument()
    expect(screen.queryByText('First criterion.')).toBeNull()
    expect(screen.queryByText('First responsibility line.')).toBeNull()
  })
})
