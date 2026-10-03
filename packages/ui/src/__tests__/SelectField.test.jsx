import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelectField, { SEARCHABLE_SELECT_MIN_OPTIONS } from '../SelectField.jsx'

describe('SelectField', () => {
  const short = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ]

  const long = Array.from({ length: SEARCHABLE_SELECT_MIN_OPTIONS }, (_, i) => ({
    value: `v${i}`,
    label: `Option ${i}`,
  }))

  it('renders a native select for short option lists', () => {
    const onChange = vi.fn()
    render(<SelectField options={short} value="" onChange={onChange} placeholder="Pick..." />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('uses SearchableSelect when options.length >= threshold', () => {
    const onChange = vi.fn()
    render(
      <SelectField
        options={long}
        value=""
        onChange={onChange}
        placeholder="Pick..."
        searchPlaceholder="Search options..."
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /pick/i }))
    expect(screen.getByPlaceholderText('Search options...')).toBeInTheDocument()
  })

  it('forceSearchable overrides a short list', () => {
    const onChange = vi.fn()
    render(
      <SelectField
        options={short}
        value=""
        onChange={onChange}
        placeholder="Pick..."
        searchPlaceholder="Find..."
        forceSearchable
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /pick/i }))
    expect(screen.getByPlaceholderText('Find...')).toBeInTheDocument()
  })

  it('forceNative keeps a long list as native select', () => {
    const onChange = vi.fn()
    render(
      <SelectField
        options={long}
        value=""
        onChange={onChange}
        placeholder="Pick..."
        forceNative
      />,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('native onChange passes option value', () => {
    const onChange = vi.fn()
    render(<SelectField options={short} value="" onChange={onChange} placeholder="Pick..." />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
