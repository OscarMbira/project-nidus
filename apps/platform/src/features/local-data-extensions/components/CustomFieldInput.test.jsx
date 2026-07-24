import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomFieldInput from './CustomFieldInput'

describe('CustomFieldInput', () => {
  it('renders checkbox for boolean type', () => {
    const def = { field_type: 'boolean', label: 'Active', validation_rules: {} }
    const onChange = vi.fn()
    render(<CustomFieldInput definition={def} value={false} onChange={onChange} />)
    const cb = screen.getByRole('checkbox')
    expect(cb).not.toBeChecked()
  })

  it('renders number input for integer type', () => {
    const def = { field_type: 'integer', label: 'Count', validation_rules: {} }
    render(<CustomFieldInput definition={def} value={3} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(3)
  })

  it('renders select for dropdown', () => {
    const def = {
      field_type: 'dropdown',
      label: 'Pick',
      validation_rules: {},
      options: [{ option_value: 'a', option_label: 'A' }],
    }
    render(<CustomFieldInput definition={def} value="a" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('a')
  })
})
