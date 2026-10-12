import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanningProvider, usePlanning, planningPath } from '../PlanningContext.jsx'

function Probe() {
  const { mode, isSim, basePath } = usePlanning()
  return <div data-testid="p">{`${mode}|${isSim}|${basePath}`}</div>
}

describe('PlanningContext', () => {
  it('gives screens the mode and base path chosen by the shell (no URL sniffing)', () => {
    render(
      <PlanningProvider mode="simulator" basePath="/simulator/pm/planning">
        <Probe />
      </PlanningProvider>
    )
    expect(screen.getByTestId('p').textContent).toBe('simulator|true|/simulator/pm/planning')
  })

  it('treats platform and planner as the public-schema mode', () => {
    render(
      <PlanningProvider mode="planner" basePath="/app/planning">
        <Probe />
      </PlanningProvider>
    )
    expect(screen.getByTestId('p').textContent).toBe('planner|false|/app/planning')
  })

  it('throws a clear error without a provider', () => {
    const original = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(/PlanningProvider/)
    } finally {
      console.error = original
    }
  })

  it('rejects an unknown mode', () => {
    const original = console.error
    console.error = () => {}
    try {
      expect(() => render(<PlanningProvider mode="admin" basePath="/x"><Probe /></PlanningProvider>)).toThrow(/Unknown planning mode/)
    } finally {
      console.error = original
    }
  })

  it('renders the project picker the shell supplies, or nothing if none is given', () => {
    const Bar = ({ isSim }) => <span data-testid="bar">{isSim ? 'sim-bar' : 'bar'}</span>
    function UsesBar() {
      const { ProjectBar, isSim } = usePlanning()
      return <ProjectBar isSim={isSim} />
    }
    const { unmount } = render(
      <PlanningProvider mode="simulator" basePath="/s" ProjectBar={Bar}>
        <UsesBar />
      </PlanningProvider>
    )
    expect(screen.getByTestId('bar').textContent).toBe('sim-bar')
    unmount()
    const { container } = render(
      <PlanningProvider mode="platform" basePath="/p">
        <UsesBar />
      </PlanningProvider>
    )
    expect(container.textContent).toBe('')
  })

  it('builds links under the base path', () => {
    expect(planningPath('/pm/planning', 'health')).toBe('/pm/planning/health')
    expect(planningPath('/pm/planning/', '/microplans/drafts')).toBe('/pm/planning/microplans/drafts')
    expect(planningPath('/pm/planning')).toBe('/pm/planning')
  })
})
