import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RecordAuditDetails from '../RecordAuditDetails.jsx'

// Minimal Supabase-like stub: users lookup by id / auth_user_id.
function dbWith(users) {
  return {
    from: () => ({
      select: () => ({
        in: (col, ids) => Promise.resolve({ data: users.filter((u) => ids.includes(u[col])), error: null }),
      }),
    }),
  }
}

describe('RecordAuditDetails (v1340)', () => {
  it('shows the placeholder before the record is saved', () => {
    render(<RecordAuditDetails db={dbWith([])} record={null} noun="contact" />)
    expect(screen.getByText('Audit details appear after this contact is saved.')).toBeInTheDocument()
  })

  it('shows Identity, Classification and Record history with resolved names', async () => {
    const db = dbWith([{ id: 'u1', auth_user_id: 'a1', full_name: 'Lindiwe Moyo', email: 'l@example.com' }])
    render(
      <RecordAuditDetails
        db={db}
        noun="contact"
        record={{ id: 'r1', created_by: 'u1', updated_by: 'u1', created_at: '2026-01-05T08:00:00Z', updated_at: '2026-02-01T09:30:00Z' }}
        identity={[{ label: 'Name', value: 'Rudo Mapfumo' }]}
        classification={[{ label: 'Contact type', value: 'internal' }]}
      />,
    )
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('Record history')).toBeInTheDocument()
    expect(screen.getByText('Rudo Mapfumo')).toBeInTheDocument()
    expect(screen.getByText('internal')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Lindiwe Moyo').length).toBe(2))
  })
})
