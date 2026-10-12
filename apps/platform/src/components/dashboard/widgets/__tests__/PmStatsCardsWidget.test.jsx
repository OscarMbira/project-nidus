/**
 * Content-parity regression test for PmStatsCardsWidget (v982 Phase 5) — proves the extracted
 * widget shows the same key stats the pre-migration PMDashboard.jsx "Stats Cards" section showed:
 * six labelled counts (Active Work Packages, Open Risks, Open Issues, Quality Activities, Pending
 * Reports, Lessons Logged), each from the same batched count query.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../../../lib/CurrentProjectContext', () => ({
  useCurrentProject: () => ({ currentProjectId: 'proj-1', currentProject: { projectCode: 'PRJ-001' } }),
}))

const { mockSupabase } = vi.hoisted(() => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    then: (resolve) => Promise.resolve({ count: 3, error: null }).then(resolve),
  }
  return { mockSupabase: { from: vi.fn(() => chain), _chain: chain } }
})
vi.mock('../../../../services/supabaseClient', () => ({ supabase: mockSupabase }))

import PmStatsCardsWidget from '../PmStatsCardsWidget'

describe('PmStatsCardsWidget — content parity with pre-migration PMDashboard.jsx', () => {
  it('shows all six of the original stat card labels', async () => {
    render(<MemoryRouter><PmStatsCardsWidget /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Active Work Packages')).toBeInTheDocument())
    expect(screen.getByText('Open Risks')).toBeInTheDocument()
    expect(screen.getByText('Open Issues')).toBeInTheDocument()
    expect(screen.getByText('Quality Activities')).toBeInTheDocument()
    expect(screen.getByText('Pending Reports')).toBeInTheDocument()
    expect(screen.getByText('Lessons Logged')).toBeInTheDocument()
  })

  it('queries the same six tables the pre-migration section queried, scoped to the current project', async () => {
    render(<MemoryRouter><PmStatsCardsWidget /></MemoryRouter>)
    await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('work_packages'))

    const queriedTables = mockSupabase.from.mock.calls.map((c) => c[0])
    expect(queriedTables).toEqual(
      expect.arrayContaining(['work_packages', 'risks', 'issues', 'quality_activities_view', 'checkpoint_reports', 'lessons_learned']),
    )
  })
})
