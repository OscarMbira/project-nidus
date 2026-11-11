/**
 * Register form — "Discard changes" in the unsaved-changes dialog leaves the form for the
 * register's list (Back link and Cancel), with the real browser history as in the app.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'

vi.mock('../../../services/localRegisterService', () => ({
  getRegisterDefinition: vi.fn(async () => ({
    success: true,
    data: {
      id: 'reg1', register_key: 'fin_x', label: 'Migration Strategy', scope_level: 'project', is_system_defined: true,
      status_workflow: [{ key: 'draft', label: 'Draft' }], fields: [],
    },
  })),
}))
vi.mock('../../../services/localRegisterRecordService', () => ({
  getRecord: vi.fn(), createRecord: vi.fn(), updateRecord: vi.fn(),
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

import LocalRegisterForm from '../LocalRegisterForm'

function List() {
  const navigate = useNavigate()
  return (
    <div>
      <h1>Register list</h1>
      <button type="button" onClick={() => navigate('/platform/local-registers/fin_x/create?projectId=p1')}>New record</button>
    </div>
  )
}

function renderApp() {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/platform/local-registers/:registerId/create" element={<LocalRegisterForm />} />
          <Route path="/platform/local-registers/:registerId" element={<List />} />
        </Routes>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}

describe('LocalRegisterForm — Discard changes', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/platform/local-registers/fin_x')
  })

  it.each([
    ['Back to Migration Strategy'],
    ['Cancel'],
  ])('leaves the form after "%s" → Discard changes', async (buttonName) => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'New record' }))
    fireEvent.change(within(await screen.findByText('Title *').then((l) => l.parentElement)).getByRole('textbox'), {
      target: { value: 'Core move' },
    })

    fireEvent.click(screen.getByRole('button', { name: buttonName }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Register list' })).toBeInTheDocument(), { timeout: 3000 })
    expect(window.location.pathname).toBe('/platform/local-registers/fin_x')
  })
})
