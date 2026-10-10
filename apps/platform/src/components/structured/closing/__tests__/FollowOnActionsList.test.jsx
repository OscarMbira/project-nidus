import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FollowOnActionsList from '../FollowOnActionsList'

vi.mock('../../../../services/closingProjectService', () => ({
  deleteFollowOnAction: vi.fn(),
}))

describe('FollowOnActionsList', () => {
  it('renders rows that store status and category instead of action_status', () => {
    render(
      <FollowOnActionsList
        actions={[{
          id: 'a1',
          action_title: 'Hypercare handover',
          action_description: 'Finish the operations handover.',
          action_category: 'benefits-realization',
          status: 'in-progress',
          priority: 'high',
          recommended_completion_date: '2026-11-01',
        }]}
        onView={() => {}}
        onEdit={() => {}}
        onRefresh={() => {}}
        onAdd={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: 'Table list view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'View action' })).toBeInTheDocument()
    expect(screen.getByText('Hypercare handover')).toBeInTheDocument()
    expect(screen.getByText('in progress')).toBeInTheDocument()
    expect(screen.getByText('benefits realization')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.getByRole('button', { name: 'Card grid view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hypercare handover')).toBeInTheDocument()
  })
})
