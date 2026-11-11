/**
 * Register form — conditional fields (v1346): fields with visible_when show only for the chosen value
 * of their controlling field, and a tab left empty disappears (Environments: cloud vs non-cloud).
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
      id: 'reg1', register_key: 'fin_x', label: 'Environments', scope_level: 'project', is_system_defined: true,
      status_workflow: [{ key: 'planned', label: 'Planned' }], fields: [
        { id: 'f1', field_key: 'hosting_model', field_label: 'Hosting Model', field_type: 'dropdown', display_order: 0,
          dropdown_options: [{ value: 'on_premise', label: 'Non-cloud' }, { value: 'cloud', label: 'Cloud' }, { value: 'hybrid', label: 'Hybrid' }] },
        { id: 'f2', field_key: 'cloud_provider', field_label: 'Cloud Provider', field_type: 'text', display_order: 1,
          field_group: 'Cloud Setup', visible_when: { field: 'hosting_model', in: ['cloud', 'hybrid'] } },
        { id: 'f3', field_key: 'cpu_cores', field_label: 'CPU Cores', field_type: 'number', display_order: 2,
          field_group: 'Infrastructure', visible_when: { field: 'hosting_model', in: ['on_premise', 'hybrid'] } },
        { id: 'f4', field_key: 'notes', field_label: 'Notes', field_type: 'multi_line', display_order: 3, field_group: 'Notes' },
      ],
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
vi.mock('@nidus/shared/hooks/usePlatformProjectId', () => ({ usePlatformProjectId: () => ({ projectId: 'p1' }) }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({ getCurrentUserAccountId: async () => 'acct1' }))

import LocalRegisterForm from '../LocalRegisterForm'

function renderForm() {
  render(
    <MemoryRouter initialEntries={['/platform/local-registers/fin_x/create']}>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/platform/local-registers/:registerId/create" element={<LocalRegisterForm />} />
          <Route path="/platform/local-registers/:registerId" element={<h1>List</h1>} />
        </Routes>
      </UnsavedChangesProvider>
    </MemoryRouter>
  )
}

describe('LocalRegisterForm conditional fields (v1346)', () => {
  beforeEach(() => {
    customFieldsResponse = { fields: [], used: 0, limit: 30, can_manage: false }
  })

  it('shows the cloud or the non-cloud tabs for the chosen hosting model', async () => {
    renderForm()
    const hosting = await screen.findByLabelText('Hosting Model')
    const tabNames = () => screen.getAllByRole('tab').map((t) => t.textContent)
    expect(tabNames()).not.toContain('Cloud Setup')
    expect(tabNames()).not.toContain('Infrastructure')
    expect(tabNames()).toContain('Notes')

    fireEvent.change(hosting, { target: { value: 'cloud' } })
    expect(tabNames()).toContain('Cloud Setup')
    expect(tabNames()).not.toContain('Infrastructure')
    fireEvent.click(screen.getByRole('tab', { name: 'Cloud Setup' }))
    expect(screen.getByLabelText('Cloud Provider')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
    fireEvent.change(screen.getByLabelText('Hosting Model'), { target: { value: 'on_premise' } })
    await waitFor(() => expect(tabNames()).toContain('Infrastructure'))
    expect(tabNames()).not.toContain('Cloud Setup')

    fireEvent.change(screen.getByLabelText('Hosting Model'), { target: { value: 'hybrid' } })
    expect(tabNames()).toEqual(expect.arrayContaining(['Cloud Setup', 'Infrastructure']))
  }, 20000) // renders the full form; slow under a full-suite run
})
