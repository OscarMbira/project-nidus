import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RowActionButton from '../RowActionButton.jsx'

describe('RowActionButton', () => {
  it('renders the Eye icon, blue color classes, and aria-label for the view variant', () => {
    render(<RowActionButton variant="view" label="View risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'View risk' })
    expect(button).not.toHaveAttribute('title')
    expect(button).toHaveAttribute('aria-label', 'View risk')
    expect(button.className).toContain('text-blue-600')
    expect(button.querySelector('svg')).toHaveClass('lucide-eye')
  })

  it('renders the Pencil icon and amber color classes for the edit variant', () => {
    render(<RowActionButton variant="edit" label="Edit risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Edit risk' })
    expect(button.className).toContain('text-amber-600')
    expect(button.querySelector('svg')).toHaveClass('lucide-pencil')
  })

  it('renders the Trash2 icon and red color classes for the delete variant', () => {
    render(<RowActionButton variant="delete" label="Delete risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Delete risk' })
    expect(button.className).toContain('text-red-600')
    expect(button.querySelector('svg')).toHaveClass('lucide-trash-2')
  })

  it('never renders visible text alongside the icon', () => {
    render(<RowActionButton variant="view" label="View risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'View risk' })
    expect(button.textContent).toBe('')
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<RowActionButton variant="view" label="View risk" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'View risk' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders nothing for an unknown variant', () => {
    const { container } = render(<RowActionButton variant="bogus" label="Nope" onClick={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('respects the disabled prop', () => {
    const onClick = vi.fn()
    render(<RowActionButton variant="delete" label="Delete risk" onClick={onClick} disabled />)
    const button = screen.getByRole('button', { name: 'Delete risk' })
    expect(button).toBeDisabled()
  })

  it('shows a tooltip with the label text on hover, and hides it on mouse leave', () => {
    render(<RowActionButton variant="view" label="View risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'View risk' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(button.parentElement)
    expect(screen.getByRole('tooltip')).toHaveTextContent('View risk')

    fireEvent.mouseLeave(button.parentElement)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows the tooltip on keyboard focus', () => {
    render(<RowActionButton variant="edit" label="Edit risk" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Edit risk' })

    fireEvent.focus(button)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Edit risk')

    fireEvent.blur(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
