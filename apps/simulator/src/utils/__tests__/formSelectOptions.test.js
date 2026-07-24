import { describe, expect, it } from 'vitest'
import {
  linesToOptionRows,
  optionRowsToLines,
  optionToLine,
  parseOptionLine,
  slugifyOptionValue,
} from '../formSelectOptions.js'

describe('formSelectOptions', () => {
  it('slugifyOptionValue normalises labels', () => {
    expect(slugifyOptionValue('High Priority')).toBe('high_priority')
  })

  it('round-trips label-only options', () => {
    const line = optionToLine({ label: 'Basic', value: 'basic' })
    expect(line).toBe('Basic')
    expect(parseOptionLine(line)).toEqual({ label: 'Basic', value: 'basic' })
  })

  it('preserves custom stored values in lines', () => {
    const line = 'High | high_priority'
    expect(parseOptionLine(line)).toEqual({ label: 'High', value: 'high_priority' })
    expect(optionRowsToLines([{ label: 'High', customValue: 'high_priority', showCustom: true }]))
      .toEqual(['High | high_priority'])
  })

  it('converts option rows back to lines', () => {
    const rows = linesToOptionRows(['Basic', 'Advanced | adv'])
    expect(optionRowsToLines(rows)).toEqual(['Basic', 'Advanced | adv'])
  })
})
