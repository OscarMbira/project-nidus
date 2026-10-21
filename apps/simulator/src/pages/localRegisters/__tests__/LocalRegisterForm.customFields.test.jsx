/**
 * Register form — organisation custom fields (v1311): Custom Fields tab, values saved with the
 * record under cf__<id>, required custom fields block Save, and adding a field from the dialog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'

const createRecord = vi.fn(async () => ({ success: true, data: { id: 'rec1', display_id: 'LREG-2026-900' } }))
const addRegisterCustomField = vi.fn()
let customFieldsResponse

vi.mock('../../../services/localRegisterService', () => ({
  getRegisterDefinition: vi.fn(async () => ({
    success: true,
    data: {
      id: 'reg1', register_key: 'fin_x', label: 'Product Configuration', scope_level: 'project', is_system_defined: true,
      status_workflow: [{ key: 'not_started', label: 'Not Started' }], fields: [],
    },
  })),
}))
vi.mock('../../../services/localRegisterRecordService', () => ({
  getRecord: vi.fn(), createRecord: (...a) => createRecord(...a), updateRecord: vi.fn(),
}))
vi.mock('../../../services/localRegisterCustomFieldService', () => ({
  listRegisterCustomFields: vi.fn(async () => ({ success: true, data: customFieldsResponse, error: null })),
  listCustomFieldLibrary: vi.fn(async () => ({ success: true, data: [], error: null })),
  addRegisterCustomField: (...a) => addRegisterCustomField(...a),
  attachRegisterCustomField: vi.fn(),
}))
vi.mock('../../../services/supabaseClient', () => ({ supabase: {} }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({ getCurrentUserAccountId: async () => 'acct1' }))

import LocalRegisterForm from '../LocalRegisterForm'

function renderForm() {
  render(
    <MemoryRouter initialEntries={['/simulator/local-registers/fin_x/create']}>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/simulator/local-registers/:registerId/create" element={<LocalRegisterForm />} />
          <Route path="/simulator/local-registers/:registerId" element={<h1>List</h1>} />
        </Routes>
      </UnsavedChangesProvider>
    </MemoryRouter>
  )
}

describe('LocalRegisterForm custom fields', () => {
  beforeEach(() => {
    createRecord.mockClear()
    addRegisterCustomField.mockReset()
    customFieldsResponse = {
      fields: [{ id: 'def1', label: 'Vendor Ticket Reference', field_type: 'text', required: true, options: [] }],
      used: 1, limit: 30, can_manage: false,
    }
  })

  it('shows a Custom Fields tab, requires the custom field, and saves its value with the record', async () => {
    renderForm()
    fireEvent.change(within(await screen.findByText('Title *').then((l) => l.parentElement)).getByRole('textbox'), {
      target: { value: 'Everyday Current Account' },
    })
    await waitFor(() => expect(screen.getByText(/Vendor Ticket Reference \(Custom Fields\)/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(screen.getByRole('tab', { name: 'Custom Fields' }))
    expect(screen.getByText('1 of 30 custom fields used')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Vendor Ticket Reference'), { target: { value: 'VT-1001' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(createRecord).toHaveBeenCalled())
    const payload = createRecord.mock.calls[0][1]
    expect(payload.fieldValues).toEqual({ cf__def1: 'VT-1001' })
  })

  it('creates a new organisation field from the dialog', async () => {
    customFieldsResponse = { fields: [], used: 0, limit: 30, can_manage: false }
    addRegisterCustomField.mockImplementation(async () => {
      customFieldsResponse = {
        fields: [{ id: 'def2', label: 'Cost Centre', field_type: 'text', required: false, options: [] }],
        used: 1, limit: 30, can_manage: false,
      }
      return { success: true, data: { status: 'created', field: { id: 'def2', label: 'Cost Centre' } }, error: null }
    })
    renderForm()
    fireEvent.click(await screen.findByRole('tab', { name: 'Custom Fields' }))
    expect(await screen.findByText(/No custom fields yet/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add custom field' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Field name *'), { target: { value: 'Cost Centre' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create field' }))

    await waitFor(() =>
      expect(addRegisterCustomField).toHaveBeenCalledWith('reg1', 'acct1', { label: 'Cost Centre', fieldType: 'text', options: [], required: false })
    )
    expect(await screen.findByLabelText('Cost Centre')).toBeInTheDocument()
  })
})
