import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DecisionLogPage from '../DecisionLogPage'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'project-1', routeKey: 'SEED334-PRJ-08', loading: false }),
}))

const { getDecisions } = vi.hoisted(() => ({
  getDecisions: vi.fn(),
}))

vi.mock('../../../services/decisionLogService', () => ({
  getDecisions,
  deleteDecision: vi.fn(),
}))

getDecisions.mockResolvedValue([
    {
      id: 'd1',
      decision_reference: 'DEC-2026-0003',
      decision_title: 'Defer optional analytics',
      status: 'deferred',
      priority: 'medium',
      decision_date: '2026-07-31',
      created_at: '2026-07-01',
    },
    {
      id: 'd2',
      decision_reference: 'DEC-2026-0004',
      decision_title: 'Approve weekend cutover',
      status: 'proposed',
      priority: 'high',
      decision_date: '2026-08-07',
      created_at: '2026-07-02',
    },
    {
      id: 'd3',
      decision_reference: 'DEC-2026-0001',
      decision_title: 'Already approved',
      status: 'approved',
      priority: 'low',
      decision_date: '2026-06-01',
      created_at: '2026-06-01',
    },
  ])

describe('Decision Log pending decisions', () => {
  it('shows view, edit, and delete on pending rows', async () => {
    render(
      <MemoryRouter>
        <DecisionLogPage />
      </MemoryRouter>
    )

    expect(await screen.findByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'View decision' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Edit decision' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Delete decision' })).toHaveLength(2)
    expect(screen.queryByText('Already approved')).not.toBeInTheDocument()
  })
})
