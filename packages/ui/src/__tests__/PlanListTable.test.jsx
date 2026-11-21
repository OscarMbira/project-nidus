import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlanListTable from '../PlanListTable'

describe('PlanListTable (plan lists as tables, 2026-11-21)', () => {
  it('shows a legacy JSON value as rows under the list’s columns', () => {
    render(<PlanListTable kind="project" listKey="budget_breakdown" value={{ staff: 400000 }} onChange={() => {}} ariaLabelPrefix="Budget" />)
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
    expect(screen.getByText('staff')).toBeInTheDocument()
    expect(screen.getByText('400000')).toBeInTheDocument()
  })

  it('hands back rows as objects keyed by column', () => {
    const onChange = vi.fn()
    render(<PlanListTable kind="stage" listKey="dependencies" value={[]} onChange={onChange} ariaLabelPrefix="Dependencies" />)
    fireEvent.change(screen.getByLabelText('New Dependencies — Dependency'), { target: { value: 'Racking delivered' } })
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(onChange).toHaveBeenCalledWith([{ dependency: 'Racking delivered', dependency_type: '', notes: '' }])
  })

  it('renders nothing for an unknown list', () => {
    const { container } = render(<PlanListTable kind="stage" listKey="nope" value={[]} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
