import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MultiSelectDropdown from '../MultiSelectDropdown'

const OPTIONS = [
  { value: 'fine', label: 'Regulatory Penalty / Fine' },
  { value: 'delay', label: 'Go-Live Delay' },
  { value: 'reputation', label: 'Reputational Damage' },
]

describe('MultiSelectDropdown', () => {
  it('adds a picked option, keeping the options order', () => {
    const onChange = vi.fn()
    render(<MultiSelectDropdown value={['reputation']} options={OPTIONS} onChange={onChange} ariaLabel="Impact types" />)
    fireEvent.change(screen.getByLabelText('Impact types'), { target: { value: 'fine' } })
    expect(onChange).toHaveBeenCalledWith(['fine', 'reputation'])
  })

  it('only offers options not yet picked, and removes a chip', () => {
    const onChange = vi.fn()
    render(<MultiSelectDropdown value={['delay']} options={OPTIONS} onChange={onChange} ariaLabel="Impact types" />)
    expect(screen.queryByRole('option', { name: 'Go-Live Delay' })).not.toBeInTheDocument()
    expect(screen.getByText('Go-Live Delay')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Go-Live Delay' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('disables the dropdown once every option is picked', () => {
    render(<MultiSelectDropdown value={['fine', 'delay', 'reputation']} options={OPTIONS} onChange={() => {}} ariaLabel="Impact types" />)
    expect(screen.getByLabelText('Impact types')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'All options selected' })).toBeInTheDocument()
  })
})
