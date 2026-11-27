/** v1358 Slice 1 — Data export page: owner-only request, list with status, downloads per ZIP part. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({ useRegionalFormatSettings: () => null }))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => {
    const React = require('react')
    const [msg, setMsg] = React.useState(null)
    return { showSuccess: (m) => setMsg(m), modal: msg ? <div role="dialog">{`${msg.operation} ${msg.recordId}`}</div> : null }
  },
}))

const { default: OrganisationDataExportPage } = await import('../organisationData/OrganisationDataExportPage.jsx')

const READY = {
  id: 'r1', reference: 'ODR-001', kind: 'export', status: 'ready', requested_by: 'Head of Finance',
  created_at: '2026-11-20T10:00:00Z', expires_at: '2026-11-27T10:00:00Z', row_count: 1200, byte_size: 2048,
  files: [{ part: 1, name: 'p1.zip', path: 'acc/r1/p1.zip', size: 1024 }, { part: 2, name: 'p2.zip', path: 'acc/r1/p2.zip', size: 1024 }],
}

function makeDb({ isOwner = true, requests = [READY], requestError = null } = {}) {
  const signed = vi.fn(async () => ({ data: { signedUrl: 'https://files.example/p1.zip' }, error: null }))
  const db = {
    rpc: vi.fn(async (fn) => {
      if (fn === 'organisation_data_requests_list') return { data: { is_owner: isOwner, requests }, error: null }
      if (fn === 'organisation_data_request_export') {
        return requestError ? { data: null, error: { message: requestError } } : { data: { id: 'r2', reference: 'ODR-002', status: 'queued' }, error: null }
      }
      return { data: null, error: null }
    }),
    storage: { from: vi.fn(() => ({ createSignedUrl: signed })) },
  }
  return { db, signed }
}

beforeEach(() => localStorage.clear())

describe('OrganisationDataExportPage (v1358)', () => {
  it('tells someone who is not the Account Owner that only the owner can export', async () => {
    const { db } = makeDb({ isOwner: false, requests: [] })
    render(<OrganisationDataExportPage db={db} />)
    expect(await screen.findByText(/Only the Account Owner can request/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Request export/ })).toBeNull()
  })

  it('lists exports and downloads each ZIP part through a signed link', async () => {
    const { db, signed } = makeDb()
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { assign }, writable: true })
    render(<OrganisationDataExportPage db={db} />)
    expect(await screen.findByText('ODR-001')).toBeInTheDocument()
    expect(screen.getByText('Ready to download')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Part 1/ }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://files.example/p1.zip'))
    expect(db.storage.from).toHaveBeenCalledWith('organisation-exports')
    expect(signed).toHaveBeenCalledWith('acc/r1/p1.zip', 300, { download: 'p1.zip' })
    expect(screen.getByRole('button', { name: /Part 2/ })).toBeInTheDocument()
  })

  it('requests an export and confirms it with the reference', async () => {
    const { db } = makeDb({ requests: [] })
    render(<OrganisationDataExportPage db={db} />)
    fireEvent.click(await screen.findByRole('button', { name: /Request export/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('created ODR-002')
    expect(db.rpc).toHaveBeenCalledWith('organisation_data_request_export')
  })

  it('disables the request while one is being prepared and shows a refusal message', async () => {
    const { db } = makeDb({ requests: [{ ...READY, id: 'r3', status: 'building', files: [] }] })
    const { unmount } = render(<OrganisationDataExportPage db={db} />)
    expect(await screen.findByText('Being prepared')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Request export/ })).toBeDisabled()
    unmount()

    const refused = makeDb({ requests: [], requestError: 'An export is already being prepared.' })
    render(<OrganisationDataExportPage db={refused.db} />)
    fireEvent.click(await screen.findByRole('button', { name: /Request export/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('An export is already being prepared.')
  })
})
