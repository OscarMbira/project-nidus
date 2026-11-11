/**
 * Edit form reached from the record page: it must not count as changed on load, and
 * "Discard changes" must leave it — with the real browser history, as in the app.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'

const longOptions = Array.from({ length: 14 }, (_, i) => ({ value: `opt_${i}`, label: `Option ${i}` }))
const fields = [
  { id: 'f1', register_id: 'reg1', field_key: 'document_owner', field_label: 'Document Owner', field_type: 'user_picker', is_required: true, field_group: null },
  { id: 'f2', register_id: 'reg1', field_key: 'system_category', field_label: 'System Category', field_type: 'dropdown', field_group: null, dropdown_options: longOptions },
  { id: 'f3', register_id: 'reg1', field_key: 'migration_approach', field_label: 'Migration Approach', field_type: 'dropdown', is_required: true, field_group: null,
    dropdown_options: [{ value: 'phased', label: 'Phased' }, { value: 'big_bang', label: 'Big bang' }] },
  { id: 'f4', register_id: 'reg1', field_key: 'target_go_live_date', field_label: 'Target Go-Live Date', field_type: 'date', field_group: null },
  { id: 'f5', register_id: 'reg1', field_key: 'migration_stages', field_label: 'Stages', field_type: 'multi_select', field_group: 'Migration Approach',
    dropdown_options: [{ value: 'extract', label: 'Extract' }, { value: 'load', label: 'Load' }] },
  { id: 'f6', register_id: 'reg1', field_key: 'risks_mitigations', field_label: 'Risks', field_type: 'table', field_group: 'Risks',
    dropdown_options: [{ value: 'risk', label: 'Risk' }, { value: 'mitigation', label: 'Mitigation' }] },
  { id: 'f7', register_id: 'reg1', field_key: 'in_scope', field_label: 'In Scope', field_type: 'multi_line', field_group: 'Scope' },
  { id: 'f8', register_id: 'reg1', field_key: 'reconciliation_tolerance', field_label: 'Tolerance', field_type: 'currency', field_group: 'Accounting' },
  { id: 'f9', register_id: 'reg1', field_key: 'user_communication_required', field_label: 'Communication', field_type: 'boolean', field_group: 'Cutover' },
  { id: 'f10', register_id: 'reg1', field_key: 'planned_downtime_hours', field_label: 'Downtime', field_type: 'number', field_group: 'Cutover' },
  { id: 'f11', register_id: 'reg1', field_key: 'introduction', field_label: 'Introduction', field_type: 'long_text', field_group: 'Executive Summary' },
]
const savedRecord = {
  id: 'rec1', display_id: 'LREG-2026-105', title: 'Data Migration Strategy', description: 'How data moves', status: 'draft', signoff_state: 'none',
  field_values: {
    document_owner: 'Fatima Bello', system_category: 'opt_3', migration_approach: 'phased', target_go_live_date: '2027-04-12',
    migration_stages: ['extract', 'load'], risks_mitigations: 'Overrun – Rehearse', in_scope: 'Customers\nAccounts',
    reconciliation_tolerance: 0, user_communication_required: true, planned_downtime_hours: 60, introduction: 'Line one\n\nLine two',
  },
}

vi.mock('../../../services/localRegisterService', () => ({
  getRegisterDefinition: vi.fn(async () => ({
    success: true,
    data: { id: 'reg1', register_key: 'fin_x', label: 'Data Migration Strategy', scope_level: 'project', is_system_defined: true, is_document: true,
      status_workflow: [{ key: 'draft', label: 'Draft' }], fields },
  })),
}))
vi.mock('../../../services/localRegisterRecordService', () => ({
  getRecord: vi.fn(async () => ({ success: true, data: savedRecord })), createRecord: vi.fn(), updateRecord: vi.fn(),
}))
vi.mock('../../../services/localRegisterCustomFieldService', () => ({
  listRegisterCustomFields: vi.fn(async () => ({ success: true, data: { fields: [], used: 0, limit: 30, can_manage: false }, error: null })),
  listCustomFieldLibrary: vi.fn(async () => ({ success: true, data: [], error: null })),
  addRegisterCustomField: vi.fn(),
  attachRegisterCustomField: vi.fn(),
}))
vi.mock('../../../services/supabaseClient', () => ({ supabase: {} }))
vi.mock('@nidus/shared/hooks/usePlatformProjectId', () => ({ usePlatformProjectId: () => ({ projectId: 'p1' }) }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({ getCurrentUserAccountId: async () => 'acct1' }))
vi.mock('@nidus/shared/services/localRegisterTemplateService', async () => {
  const actual = await vi.importActual('@nidus/shared/services/localRegisterTemplateService')
  return {
    ...actual,
    canManageRegisterTemplates: async () => false,
    listRegisterTemplates: async () => ({ success: true, data: [] }),
  }
})

import LocalRegisterForm from '../LocalRegisterForm'

function Detail() {
  const navigate = useNavigate()
  return (
    <div>
      <h1>Record page</h1>
      <button type="button" onClick={() => navigate('/platform/local-registers/fin_x/rec1/edit?projectId=p1')}>Edit</button>
    </div>
  )
}

function renderApp() {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/platform/local-registers/:registerId/:recordId/edit" element={<LocalRegisterForm />} />
          <Route path="/platform/local-registers/:registerId/:recordId" element={<Detail />} />
          <Route path="/platform/local-registers/:registerId" element={<h1>Register list</h1>} />
        </Routes>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}

async function openEdit() {
  renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  await screen.findByRole('heading', { name: 'Edit Data Migration Strategy' })
  // Let any on-mount effects of the field inputs run.
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
}

describe('LocalRegisterForm (edit) — unsaved changes', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/platform/local-registers/fin_x/rec1')
  })

  it('does not count as changed when nothing was edited (Back leaves without asking)', async () => {
    await openEdit()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Data Migration Strategy' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Register list' })).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument()
  })

  it.each(['Back to Data Migration Strategy', 'Cancel'])('"%s" → Discard changes leaves after an edit', async (buttonName) => {
    await openEdit()
    fireEvent.change(screen.getByDisplayValue('Data Migration Strategy'), { target: { value: 'Changed title' } })
    fireEvent.click(screen.getByRole('button', { name: buttonName }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Register list' })).toBeInTheDocument(), { timeout: 3000 })
  })

  it('browser Back → Discard changes leaves after an edit', async () => {
    await openEdit()
    fireEvent.change(screen.getByDisplayValue('Data Migration Strategy'), { target: { value: 'Changed title' } })
    await act(async () => { window.history.back() })
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Record page' })).toBeInTheDocument(), { timeout: 3000 })
  })
})
