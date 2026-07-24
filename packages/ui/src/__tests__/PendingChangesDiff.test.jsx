import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PendingChangesDiff from '../PendingChangesDiff.jsx'

describe('PendingChangesDiff', () => {
  it('renders field diff rows', () => {
    render(
      <PendingChangesDiff
        pending={{
          proposed_changes: { risk_title: 'New title' },
          current_values: { risk_title: 'Old title' },
          submitted_at: '2026-07-06T12:00:00.000Z',
        }}
      />
    )

    expect(screen.getByText('Pending changes')).toBeInTheDocument()
    expect(screen.getByText('Old title')).toBeInTheDocument()
    expect(screen.getByText('New title')).toBeInTheDocument()
  })

  it('shows empty state when no proposed fields', () => {
    render(<PendingChangesDiff pending={{ proposed_changes: {}, current_values: {} }} />)
    expect(screen.getByText(/No deferred field changes/i)).toBeInTheDocument()
  })
})
