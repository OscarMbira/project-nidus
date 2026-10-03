import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MultiLineListInput, { parseMultiLineValue, joinMultiLineValue } from '../MultiLineListInput.jsx'

vi.mock('@nidus/shared/hooks/useViewMode', () => ({
  useViewMode: vi.fn(() => ['list', vi.fn()]),
}))

vi.mock('@nidus/shared/utils/tableRowNumberUtils', () => ({
  getDisplayRowNumber: (index) => index + 1,
}))

import { useViewMode } from '@nidus/shared/hooks/useViewMode'

describe('parseMultiLineValue / joinMultiLineValue', () => {
  it('parses newline-joined strings and drops blanks', () => {
    expect(parseMultiLineValue('a\n\nb\n  ')).toEqual(['a', 'b'])
    expect(parseMultiLineValue(null)).toEqual([])
  })

  it('joins lines with newlines', () => {
    expect(joinMultiLineValue(['a', 'b', ''])).toBe('a\nb')
  })
})

describe('MultiLineListInput', () => {
  beforeEach(() => {
    useViewMode.mockReturnValue(['list', vi.fn()])
  })

  it('renders table rows and adds a line', () => {
    const onChange = vi.fn()
    render(
      <MultiLineListInput
        viewModeId="test-objectives"
        value={"First objective"}
        onChange={onChange}
        ariaLabelPrefix="objective"
        itemColumnLabel="Objective"
      />
    )
    expect(screen.getByText('First objective')).toBeTruthy()
    expect(screen.getByText('Objective')).toBeTruthy()

    const input = screen.getByLabelText('New objective')
    fireEvent.change(input, { target: { value: 'Second objective' } })
    fireEvent.click(screen.getByRole('button', { name: /Add/i }))
    expect(onChange).toHaveBeenCalledWith('First objective\nSecond objective')
  })

  it('adds the current line when Enter is pressed', () => {
    const onChange = vi.fn()
    render(
      <MultiLineListInput
        viewModeId="test-objectives"
        value={"First objective"}
        onChange={onChange}
        ariaLabelPrefix="objective"
      />
    )
    const input = screen.getByLabelText('New objective')
    fireEvent.change(input, { target: { value: 'Second objective' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('First objective\nSecond objective')
  })

  it('inline edits a row and saves', () => {
    const onChange = vi.fn()
    render(
      <MultiLineListInput
        viewModeId="test-objectives"
        value={"Alpha"}
        onChange={onChange}
        ariaLabelPrefix="objective"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit objective 1' }))
    const editInput = screen.getByLabelText('Edit objective 1')
    fireEvent.change(editInput, { target: { value: 'Beta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save objective 1' }))
    expect(onChange).toHaveBeenCalledWith('Beta')
  })

  it('requires confirmation before delete', () => {
    const onChange = vi.fn()
    render(
      <MultiLineListInput
        viewModeId="test-objectives"
        value={"Keep me\nDrop me"}
        onChange={onChange}
        ariaLabelPrefix="objective"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove objective 2' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/Remove this objective/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith('Keep me')
  })

  it('shows stacked list when viewMode is grid', () => {
    useViewMode.mockReturnValue(['grid', vi.fn()])
    render(
      <MultiLineListInput
        viewModeId="test-objectives"
        value={"Only one"}
        onChange={() => {}}
        ariaLabelPrefix="objective"
      />
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Only one')).toBeTruthy()
  })
})
