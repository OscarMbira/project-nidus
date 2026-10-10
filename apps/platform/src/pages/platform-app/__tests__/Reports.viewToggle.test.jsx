import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Reports from '../Reports'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ routeKey: 'SEED334-PRJ-08', projectId: 'project-1' }),
}))

describe('Report Library', () => {
  it('defaults to the table list and can switch to cards', () => {
    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'Table list view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('columnheader', { name: /Report/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create report' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Change Report' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Custom Reports' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Change Report' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.getByRole('button', { name: 'Card grid view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Project Status Report' })).toBeInTheDocument()
  })
})
