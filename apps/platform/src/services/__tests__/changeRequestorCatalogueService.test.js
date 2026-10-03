import { describe, it, expect } from 'vitest'
import { buildRequestorSelectOptions } from '../changeRequestorCatalogueService'

describe('buildRequestorSelectOptions', () => {
  it('merges people and organisations, drops repeats, and sorts', () => {
    const options = buildRequestorSelectOptions([
      'Finance',
      '  finance ',
      'Ada Lovelace',
      'Board',
    ])
    expect(options.map((option) => option.label)).toEqual([
      'Ada Lovelace',
      'Board',
      'Finance',
    ])
  })

  it('keeps a saved value that is not in the current lists', () => {
    const options = buildRequestorSelectOptions(['Planning Office'], 'External sponsor')
    expect(options[0]).toEqual({ value: 'External sponsor', label: 'External sponsor' })
  })
})
