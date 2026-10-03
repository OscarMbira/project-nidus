/**
 * DashboardFramework render tests (v982 Phase 5) — asserts widget selection directly (which
 * widgets actually mounted), not just that "a page renders". Uses small mock widget components
 * (not real, service-fetching ones) so this test exercises the framework's own selection logic in
 * isolation from any persona's real content.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardFramework from '../DashboardFramework'

function MockWidget(label) {
  return function Widget() {
    return <div data-testid={`widget-${label}`}>{label} content</div>
  }
}

describe('DashboardFramework', () => {
  it('renders only the widgets the viewer qualifies for — a PM never sees a PMO-only widget', () => {
    const widgets = [
      { id: 'pmo-only', title: 'PMO Only', component: MockWidget('pmo-only'), requiredRole: ['pmo_admin'] },
      { id: 'pm-only', title: 'PM Only', component: MockWidget('pm-only'), requiredRole: ['project_manager'] },
      { id: 'universal', title: 'Universal', component: MockWidget('universal') },
    ]
    render(
      <DashboardFramework
        widgets={widgets}
        viewerContext={{ roleNames: ['project_manager'] }}
      />,
    )

    expect(screen.getByTestId('widget-pm-only')).toBeInTheDocument()
    expect(screen.getByTestId('widget-universal')).toBeInTheDocument()
    expect(screen.queryByTestId('widget-pmo-only')).not.toBeInTheDocument()
  })

  it('and vice versa — a PMO Admin viewer never sees a PM-only widget', () => {
    const widgets = [
      { id: 'pmo-only', title: 'PMO Only', component: MockWidget('pmo-only'), requiredRole: ['pmo_admin'] },
      { id: 'pm-only', title: 'PM Only', component: MockWidget('pm-only'), requiredRole: ['project_manager'] },
    ]
    render(
      <DashboardFramework
        widgets={widgets}
        viewerContext={{ roleNames: ['pmo_admin'] }}
      />,
    )

    expect(screen.getByTestId('widget-pmo-only')).toBeInTheDocument()
    expect(screen.queryByTestId('widget-pm-only')).not.toBeInTheDocument()
  })

  it('excludes a scope-gated widget when the viewer context lacks that scope', () => {
    const widgets = [
      { id: 'project-scoped', title: 'Project Scoped', component: MockWidget('project-scoped'), requiredScope: ['projectId'] },
    ]
    const { rerender } = render(<DashboardFramework widgets={widgets} viewerContext={{ roleNames: [] }} />)
    expect(screen.queryByTestId('widget-project-scoped')).not.toBeInTheDocument()

    rerender(<DashboardFramework widgets={widgets} viewerContext={{ roleNames: [], projectId: 'proj-1' }} />)
    expect(screen.getByTestId('widget-project-scoped')).toBeInTheDocument()
  })

  it('renders the empty state when zero widgets qualify, not a broken/blank grid', () => {
    const widgets = [{ id: 'pmo-only', title: 'PMO Only', component: MockWidget('pmo-only'), requiredRole: ['pmo_admin'] }]
    render(<DashboardFramework widgets={widgets} viewerContext={{ roleNames: ['team_member'] }} />)
    expect(screen.getByText('Nothing to show here yet.')).toBeInTheDocument()
  })

  it('renders a custom emptyState when provided', () => {
    render(
      <DashboardFramework
        widgets={[{ id: 'pmo-only', title: 'PMO Only', component: MockWidget('pmo-only'), requiredRole: ['pmo_admin'] }]}
        viewerContext={{ roleNames: [] }}
        emptyState={<div data-testid="custom-empty">Custom empty</div>}
      />,
    )
    expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
  })

  it('renders title and subtitle when provided', () => {
    render(<DashboardFramework widgets={[]} viewerContext={{ roleNames: [] }} title="My Home" subtitle="Welcome back" />)
    expect(screen.getByText('My Home')).toBeInTheDocument()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })
})
