import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FieldHelpInputs, { pickFieldHelp } from '../FieldHelpInputs'

describe('FieldHelpInputs (v1345 slice 1b)', () => {
  it('edits purpose, example and format, and flags missing required parts', () => {
    const onChange = vi.fn()
    render(<FieldHelpInputs value={{ help_purpose: '', help_example: '' }} onChange={onChange} showErrors />)
    expect(screen.getByText('Say what this field is for.')).toBeInTheDocument()
    expect(screen.getByText('Give one example value.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('What is this field for? *'), { target: { value: 'Supplier importance' } })
    expect(onChange).toHaveBeenCalledWith({ help_purpose: 'Supplier importance', help_example: '' })
    expect(screen.getByPlaceholderText(/Dubai/)).toBeInTheDocument()
  })

  it('starts from an existing definition (description becomes the purpose)', () => {
    expect(pickFieldHelp({ description: 'Old text' })).toEqual({ help_purpose: 'Old text', help_example: '', help_format: '' })
    expect(pickFieldHelp({ help_purpose: 'P', help_example: 'E', help_format: 'F' })).toEqual({ help_purpose: 'P', help_example: 'E', help_format: 'F' })
  })
})
