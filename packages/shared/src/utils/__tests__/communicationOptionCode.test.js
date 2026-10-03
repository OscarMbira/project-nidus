import { describe, expect, it } from 'vitest'
import { communicationOptionCodeFromLabel } from '../communicationOptionCode'

describe('communicationOptionCodeFromLabel', () => {
  it('makes a lowercase code from a label', () => {
    expect(communicationOptionCodeFromLabel('Level of detail')).toBe('level_of_detail')
  })

  it('drops punctuation and extra spaces', () => {
    expect(communicationOptionCodeFromLabel('  Site notice! ')).toBe('site_notice')
  })

  it('returns an empty code when the label has no letters or digits', () => {
    expect(communicationOptionCodeFromLabel('---')).toBe('')
  })
})
