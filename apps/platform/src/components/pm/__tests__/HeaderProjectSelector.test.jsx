import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeaderProjectSelector from '../HeaderProjectSelector'

const menu = vi.hoisted(() => ({ layoutHint: null }))

vi.mock('../../../lib/useMenu', () => ({
  useMenu: () => ({ layoutHint: menu.layoutHint }),
}))

vi.mock('../PMProjectSelector', () => ({
  default: () => <div data-testid="project-selector" />,
}))

describe('HeaderProjectSelector', () => {
  it('shows the selector on a PM route straight away', () => {
    menu.layoutHint = null
    render(<HeaderProjectSelector routeIsPm />)
    expect(screen.getByTestId('project-selector')).toBeInTheDocument()
  })

  it('shows the selector once the menu reports a PM layout, even when the route check was not ready', () => {
    menu.layoutHint = { layout: 'pm' }
    render(<HeaderProjectSelector routeIsPm={false} />)
    expect(screen.getByTestId('project-selector')).toBeInTheDocument()
  })

  it('hides the selector for a non-PM user on a non-PM route', () => {
    menu.layoutHint = { layout: 'pmo' }
    render(<HeaderProjectSelector routeIsPm={false} />)
    expect(screen.queryByTestId('project-selector')).toBeNull()
  })
})
