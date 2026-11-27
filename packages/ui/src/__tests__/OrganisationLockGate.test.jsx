/** v1358 Slice 3a — OrganisationLockGate: open when not locked or unreadable; owner keeps the data page; others see a notice. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({ useRegionalFormatSettings: () => null }))

const { default: OrganisationLockGate, clearOrganisationLockCache } = await import('../organisationData/OrganisationLockGate.jsx')

const dbWith = (result) => ({ rpc: vi.fn(async () => result) })
const LOCKED = { locked: true, organisation: 'Example Freight Ltd', deletion_due_at: '2026-12-27T00:00:00Z' }

const renderGate = (db, path = '/platform/dashboard', props = {}) => render(
  <MemoryRouter initialEntries={[path]}>
    <OrganisationLockGate db={db} allowPath="/platform/organisation/data-export" {...props}>
      <p>App content</p>
    </OrganisationLockGate>
  </MemoryRouter>,
)

beforeEach(() => clearOrganisationLockCache())

describe('OrganisationLockGate', () => {
  it('shows the app when the organisation is not locked, or when the status cannot be read', async () => {
    renderGate(dbWith({ data: { locked: false }, error: null }))
    expect(await screen.findByText('App content')).toBeInTheDocument()
    clearOrganisationLockCache()
    renderGate(dbWith({ data: null, error: { message: 'function does not exist' } }))
    expect((await screen.findAllByText('App content')).length).toBeGreaterThan(0)
  })

  it('keeps members out with a closing notice and a sign-out button', async () => {
    const onSignOut = vi.fn()
    renderGate(dbWith({ data: { ...LOCKED, is_owner: false }, error: null }), '/platform/dashboard', { onSignOut })
    expect(await screen.findByText('Example Freight Ltd is closing')).toBeInTheDocument()
    expect(screen.queryByText('App content')).toBeNull()
    expect(screen.queryByRole('link', { name: /Data export/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalled()
  })

  it('sends the owner to Data export & deletion, and shows that page with a notice', async () => {
    const db = dbWith({ data: { ...LOCKED, is_owner: true }, error: null })
    const { unmount } = renderGate(db)
    expect(await screen.findByRole('link', { name: /Open Data export/ })).toHaveAttribute('href', '/platform/organisation/data-export')
    unmount()
    renderGate(db, '/platform/organisation/data-export')
    expect(await screen.findByText('App content')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Example Freight Ltd is locked')
  })
})
