import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectsEVMLandingPage from '../ProjectsEVMLandingPage'

const fromMock = vi.fn()

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectsEVMLandingPage />
    </MemoryRouter>,
  )
}

describe('ProjectsEVMLandingPage — loads EVM snapshots in a single batched query (v1237)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all projects\' snapshots in one query, not one per project', async () => {
    const projects = [
      { id: 'p-1', project_code: 'SEED334-PRJ-01', project_name: 'Alpha' },
      { id: 'p-2', project_code: 'SEED334-PRJ-02', project_name: 'Beta' },
    ]
    const snapshots = [
      { project_id: 'p-1', period_date: '2026-01-31', planned_value: 100, earned_value: 90, actual_cost: 95 },
      { project_id: 'p-1', period_date: '2026-02-28', planned_value: 200, earned_value: 180, actual_cost: 190 },
      { project_id: 'p-2', period_date: '2026-01-31', planned_value: 50, earned_value: 40, actual_cost: 45 },
    ]

    const projectsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: projects, error: null }),
    }
    const snapshotsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: snapshots, error: null }),
    }
    fromMock.mockImplementation((table) => {
      if (table === 'projects') return projectsChain
      if (table === 'project_evm_snapshots') return snapshotsChain
      return projectsChain
    })

    renderPage()

    await waitFor(() => expect(screen.getByText(/SEED334-PRJ-01/)).toBeInTheDocument())
    expect(screen.getByText(/SEED334-PRJ-02/)).toBeInTheDocument()
    // Latest snapshot per project only — p-1 shows its Feb row, not its (superseded) Jan row
    const prj01Row = screen.getByText(/SEED334-PRJ-01/).closest('tr')
    expect(within(prj01Row).getByText('2026-02-28')).toBeInTheDocument()
    expect(within(prj01Row).queryByText('2026-01-31')).toBeNull()

    // Exactly one call to project_evm_snapshots, not one per project
    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(snapshotsChain.in).toHaveBeenCalledWith('project_id', ['p-1', 'p-2'])
  })
})
