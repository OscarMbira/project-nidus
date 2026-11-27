/** v1358 — Data export & deletion page: owner-only export, downloads per ZIP part, deletion request / confirm / cancel. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({ useRegionalFormatSettings: () => null }))
vi.mock('@nidus/shared/context/FieldHelpContext', () => ({
  FieldHelpScope: ({ children }) => children,
  useFieldHelpEntry: () => null,
  useFieldHelpScope: () => null,
}))
vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.(), requestNavigation: vi.fn(), confirmBack: vi.fn() }),
}))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => {
    const React = require('react')
    const [msg, setMsg] = React.useState(null)
    return { showSuccess: (m) => setMsg(m), modal: msg ? <div role="dialog">{`${msg.operation} ${msg.recordId}: ${msg.message}`}</div> : null }
  },
}))

const { default: OrganisationDataExportPage } = await import('../organisationData/OrganisationDataExportPage.jsx')

const READY = {
  id: 'r1', reference: 'ODR-001', kind: 'export', status: 'ready', requested_by: 'Head of Finance',
  created_at: '2026-11-20T10:00:00Z', expires_at: '2026-11-27T10:00:00Z', row_count: 1200, byte_size: 2048,
  files: [{ part: 1, name: 'p1.zip', path: 'acc/r1/p1.zip', size: 1024 }, { part: 2, name: 'p2.zip', path: 'acc/r1/p2.zip', size: 1024 }],
}
const DELETION = { id: 'd1', reference: 'ODR-005', kind: 'deletion', status: 'pending_approval', created_at: '2026-11-21T10:00:00Z', files: [] }

function makeDb({ isOwner = true, requests = [READY], errors = {}, results = {} } = {}) {
  const signed = vi.fn(async () => ({ data: { signedUrl: 'https://files.example/p1.zip' }, error: null }))
  const db = {
    rpc: vi.fn(async (fn) => {
      if (fn === 'organisation_data_requests_list') return { data: { is_owner: isOwner, requests }, error: null }
      if (errors[fn]) return { data: null, error: { message: errors[fn] } }
      return { data: results[fn] ?? {}, error: null }
    }),
    storage: { from: vi.fn(() => ({ createSignedUrl: signed })) },
  }
  return { db, signed }
}

function LocationProbe() {
  const { search } = useLocation()
  return <span data-testid="search">{search}</span>
}

const renderPage = (db, url = '/data') => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/data" element={<><OrganisationDataExportPage db={db} /><LocationProbe /></>} />
    </Routes>
  </MemoryRouter>,
)

beforeEach(() => localStorage.clear())

describe('OrganisationDataExportPage — export (slice 1)', () => {
  it('tells someone who is not the Account Owner that only the owner can export or delete', async () => {
    const { db } = makeDb({ isOwner: false, requests: [] })
    renderPage(db)
    expect(await screen.findByText(/Only the Account Owner can export or delete/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Request export/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Request deletion/ })).toBeNull()
  })

  it('lists exports and downloads each ZIP part through a signed link', async () => {
    const { db, signed } = makeDb()
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true })
    renderPage(db)
    expect(await screen.findByText('ODR-001')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Part 1/ }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://files.example/p1.zip'))
    expect(signed).toHaveBeenCalledWith('acc/r1/p1.zip', 300, { download: 'p1.zip' })
  })

  it('requests an export and confirms it with the reference', async () => {
    const { db } = makeDb({ requests: [], results: { organisation_data_request_export: { id: 'r2', reference: 'ODR-002' } } })
    renderPage(db)
    fireEvent.click(await screen.findByRole('button', { name: /Request export/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('created ODR-002')
  })

  it('disables the export button while one is being prepared', async () => {
    const { db } = makeDb({ requests: [{ ...READY, id: 'r3', status: 'building', files: [] }] })
    renderPage(db)
    expect(await screen.findByText('Being prepared')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Request export/ })).toBeDisabled()
  })
})

describe('OrganisationDataExportPage — deletion (slice 3a)', () => {
  it('needs a reason, sends the request and keeps deletion requests out of the export list', async () => {
    const { db } = makeDb({ requests: [READY], results: { organisation_data_request_deletion: { id: 'd2', reference: 'ODR-006' } } })
    renderPage(db)
    fireEvent.click(await screen.findByRole('button', { name: /Request deletion/ }))
    const send = screen.getByRole('button', { name: /Send deletion request/ })
    expect(send).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Moving to another tool' } })
    fireEvent.click(send)
    expect(await screen.findByRole('dialog')).toHaveTextContent('created ODR-006')
    expect(db.rpc).toHaveBeenCalledWith('organisation_data_request_deletion', { p_reason: 'Moving to another tool' })
  })

  it('shows an open request and cancels it after a second click', async () => {
    const { db } = makeDb({ requests: [DELETION, READY], results: { organisation_data_cancel_deletion: { id: 'd1', status: 'cancelled', was: 'pending_approval' } } })
    renderPage(db)
    expect(await screen.findByText('Waiting for approval')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Request deletion/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Cancel deletion/ }))
    fireEvent.click(screen.getByRole('button', { name: /Yes, cancel the deletion/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('updated ODR-005')
    expect(db.rpc).toHaveBeenCalledWith('organisation_data_cancel_deletion')
  })

  it('confirms the emailed link once and removes the token from the address', async () => {
    const { db } = makeDb({ requests: [], results: { organisation_data_confirm_deletion: { id: 'd1', reference: 'ODR-005', status: 'locked' } } })
    renderPage(db, '/data?confirm=tok123')
    expect(await screen.findByRole('dialog')).toHaveTextContent('updated ODR-005: Deletion confirmed')
    expect(db.rpc).toHaveBeenCalledWith('organisation_data_confirm_deletion', { p_token: 'tok123' })
    expect(db.rpc.mock.calls.filter(([fn]) => fn === 'organisation_data_confirm_deletion')).toHaveLength(1)
    expect(screen.getByTestId('search').textContent).toBe('')
  })

  it('shows why a confirmation link was refused', async () => {
    const { db } = makeDb({ requests: [], errors: { organisation_data_confirm_deletion: 'This confirmation link has expired.' } })
    renderPage(db, '/data?confirm=old')
    expect(await screen.findByRole('alert')).toHaveTextContent('This confirmation link has expired.')
  })
})
