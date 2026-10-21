/**
 * Register list page — Delete row action (soft delete, confirm first, hidden while a record
 * awaits approval).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const deleteRecord = vi.fn(async () => ({ success: true, error: null }))

vi.mock('../../../services/localRegisterService', () => ({
  getRegisterDefinition: vi.fn(async () => ({
    success: true,
    data: {
      id: 'r1', register_key: 'fin_x', label: 'Product Configuration', scope_level: 'project',
      is_system_defined: true, status_workflow: [{ key: 'tested', label: 'Tested' }], fields: [],
    },
  })),
}))
vi.mock('../../../services/localRegisterRecordService', () => ({
  listRecords: vi.fn(async () => ({
    success: true,
    data: [
      { id: 'a', title: 'Everyday Current Account', display_id: 'LREG-2026-101', status: 'tested', record_status: 'live', field_values: {} },
      { id: 'b', title: 'Home Loan', display_id: 'LREG-2026-102', status: 'tested', record_status: 'unauthorised', field_values: {} },
    ],
  })),
  deleteRecord: (...args) => deleteRecord(...args),
}))
vi.mock('@nidus/shared/hooks/usePlatformProjectId', () => ({ usePlatformProjectId: () => ({ projectId: 'p1' }) }))
vi.mock('@nidus/shared/hooks/useViewMode', () => ({ useViewMode: () => ['list', () => {}] }))
vi.mock('../../../lib/useRegisterCustomFields', () => ({
  useRegisterCustomFields: () => ({ fields: [], used: 0, limit: 30, canManage: false, loading: false, error: '' }),
}))

import LocalRegisterListPage from '../LocalRegisterListPage'

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/platform/local-registers/fin_x']}>
      <Routes>
        <Route path="/platform/local-registers/:registerId" element={<LocalRegisterListPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LocalRegisterListPage delete action', () => {
  beforeEach(() => deleteRecord.mockClear())

  it('confirms, soft-deletes and removes the row', async () => {
    renderPage()
    const row = (await screen.findByText('Everyday Current Account')).closest('tr')
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Product Configuration' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Everyday Current Account')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteRecord).toHaveBeenCalledWith('a'))
    await waitFor(() => expect(screen.queryByText('Everyday Current Account')).not.toBeInTheDocument())
  })

  it('hides Delete on a record awaiting approval', async () => {
    renderPage()
    const row = (await screen.findByText('Home Loan')).closest('tr')
    expect(within(row).queryByRole('button', { name: 'Delete Product Configuration' })).not.toBeInTheDocument()
  })

  it('does not delete when the dialog is cancelled', async () => {
    renderPage()
    const row = (await screen.findByText('Everyday Current Account')).closest('tr')
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Product Configuration' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(deleteRecord).not.toHaveBeenCalled()
    expect(screen.getByText('Everyday Current Account')).toBeInTheDocument()
  })
})
