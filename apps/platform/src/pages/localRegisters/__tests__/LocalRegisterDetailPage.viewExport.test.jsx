/**
 * Register record view page — View (preview) and Export buttons beside Edit.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../../services/localRegisterService', () => ({
  getRegisterDefinition: vi.fn(async () => ({
    success: true,
    data: {
      id: 'reg1', register_key: 'fin_transformation_overview', label: 'Transformation Overview', scope_level: 'project',
      is_system_defined: true, status_workflow: [{ key: 'published', label: 'Published' }],
      fields: [
        { id: 'f1', field_key: 'executive_sponsor', field_label: 'Executive Sponsor', field_type: 'user_picker', field_group: 'Governance' },
        { id: 'f2', field_key: 'approved_budget', field_label: 'Approved Budget', field_type: 'currency', field_group: null },
      ],
    },
  })),
}))
vi.mock('../../../services/localRegisterRecordService', () => ({
  getRecord: vi.fn(async () => ({
    success: true,
    data: { id: 'rec1', display_id: 'LREG-2026-002', title: 'Core Banking Modernisation Programme', status: 'published',
      field_values: { executive_sponsor: 'Grace Moyo', approved_budget: 18500000 } },
  })),
  getRecordApprovalChain: vi.fn(),
  listRecords: vi.fn(async () => ({ success: true, data: [], error: null })),
  submitRecordForAuthorisation: vi.fn(),
}))
vi.mock('../../../services/supabaseClient', () => ({ supabase: {} }))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({
  useRegionalFormatSettings: () => ({ currency_code: 'USD', locale: 'en-US', decimal_places: 2 }),
}))
vi.mock('../../../lib/useRegisterCustomFields', () => ({
  useRegisterCustomFields: () => ({ fields: [], used: 0, limit: 30, canManage: false, loading: false, error: '', managePath: '' }),
}))
vi.mock('@nidus/ui/RecordPreviewModal', () => ({
  default: ({ isOpen, sections, record, baseFilename }) =>
    isOpen ? (
      <div role="dialog" aria-label="Record preview">
        <p>{baseFilename}</p>
        <p>{sections.map((s) => s.title).join(' | ')}</p>
        <p>{record.executive_sponsor}</p>
      </div>
    ) : null,
}))

import LocalRegisterDetailPage from '../LocalRegisterDetailPage'

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/platform/local-registers/fin_transformation_overview/rec1']}>
      <Routes>
        <Route path="/platform/local-registers/:registerId/:recordId" element={<LocalRegisterDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('LocalRegisterDetailPage View and Export', () => {
  it('shows amounts in the organisation currency format', async () => {
    renderPage()
    expect(await screen.findByText('$18,500,000.00')).toBeInTheDocument()
  })

  it('shows View and Export beside Edit', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('opens the preview with the record sections and values', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'View' }))
    const preview = screen.getByRole('dialog', { name: 'Record preview' })
    expect(preview).toHaveTextContent('fin_transformation_overview_LREG-2026-002')
    expect(preview).toHaveTextContent('Details | Governance')
    expect(preview).toHaveTextContent('Grace Moyo')
  })
})
