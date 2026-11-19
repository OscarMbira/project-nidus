import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectMilestonesSummary from '../ProjectMilestonesSummary'

describe('ProjectMilestonesSummary (v1344 A5)', () => {
  it('lists the register read-only with a manage link', async () => {
    const load = vi.fn().mockResolvedValue({ success: true, data: [
      { id: 'm1', milestone_name: 'Design sign-off', target_date: '2026-03-01', status: 'achieved' },
      { id: 'm2', milestone_name: 'Pilot live', target_date: '2026-05-01', forecast_date: '2026-05-20', status: 'at_risk' },
    ] })
    render(<MemoryRouter><ProjectMilestonesSummary projectId="p1" loadMilestones={load} manageHref="/platform/milestones?projectId=p1" formatDate={(v) => v} /></MemoryRouter>)
    expect(await screen.findByText('Design sign-off')).toBeInTheDocument()
    expect(screen.getByText('At risk')).toBeInTheDocument()
    expect(screen.getByText('2026-05-20')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage milestones' })).toHaveAttribute('href', '/platform/milestones?projectId=p1')
    expect(load).toHaveBeenCalledWith('p1')
  })

  it('says when there is no project or no milestone', async () => {
    const { unmount } = render(<MemoryRouter><ProjectMilestonesSummary projectId={null} loadMilestones={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/link the brief to a project/i)).toBeInTheDocument()
    unmount()
    render(<MemoryRouter><ProjectMilestonesSummary projectId="p2" loadMilestones={vi.fn().mockResolvedValue({ success: true, data: [] })} /></MemoryRouter>)
    expect(await screen.findByText(/no milestones recorded/i)).toBeInTheDocument()
  })
})
