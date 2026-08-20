import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RiskForm from '../RiskForm.jsx'

// RiskForm previously gave NO feedback at all on save (v861 fix, PRD D5) — this test
// guards that a success confirmation now appears, and that onSave() only fires after
// the user clicks OK (not immediately on save, matching the modal's blocking intent).

function chainable(result) {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve) => resolve(result)
      }
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn((table) => {
      if (table === 'risks') {
        return chainable({ data: { risk_code: 'RISK-2026-014' }, error: null })
      }
      return chainable({ data: [], error: null })
    }),
  },
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.() }),
}))

describe('RiskForm — success confirmation (v861)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a success modal on create and only calls onSave after OK is clicked', async () => {
    const onSave = vi.fn()
    const { container } = render(<RiskForm risk={null} projectId="project-1" onSave={onSave} onCancel={() => {}} />)

    // Labels aren't programmatically associated (no htmlFor/id) — query by name directly.
    // Both risk_title and risk_description are `required`, so both must be filled or the
    // browser's native constraint validation silently blocks the submit event in jsdom.
    fireEvent.change(container.querySelector('input[name="risk_title"]'), { target: { value: 'Vendor delay' } })
    fireEvent.change(container.querySelector('textarea[name="risk_description"]'), { target: { value: 'Key vendor is behind schedule.' } })
    fireEvent.click(screen.getByRole('button', { name: /Create Risk/i }))

    await waitFor(() => expect(screen.getByText('RISK-2026-014')).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
