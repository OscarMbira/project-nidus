import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Tooltip from '../Tooltip.jsx'

describe('Tooltip', () => {
  it('renders children without a tooltip role when no label is passed', () => {
    render(
      <Tooltip>
        <button>Plain</button>
      </Tooltip>
    )
    expect(screen.getByRole('button', { name: 'Plain' })).toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows the label on hover and hides it on mouse leave', () => {
    render(
      <Tooltip label="Delete risk">
        <button>Trigger</button>
      </Tooltip>
    )
    const wrapper = screen.getByRole('button', { name: 'Trigger' }).parentElement

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseEnter(wrapper)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Delete risk')
    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows the label on focus and hides it on blur', () => {
    render(
      <Tooltip label="Edit risk">
        <button>Trigger</button>
      </Tooltip>
    )
    const button = screen.getByRole('button', { name: 'Trigger' })

    fireEvent.focus(button)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Edit risk')
    fireEvent.blur(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
