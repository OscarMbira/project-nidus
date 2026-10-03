import { describe, it, expect } from 'vitest'
import { periodSelectOptions } from '../stakeholderAnalysisPeriodService'

describe('periodSelectOptions', () => {
  it('sorts shared and organisation periods and drops a repeated name', () => {
    const options = periodSelectOptions([
      { period_name: 'Quarterly' },
      { period_name: 'Initiation' },
      { period_name: 'initiation' },
      { period_name: '  Stage review  ' },
    ])
    expect(options.map((option) => option.label)).toEqual([
      'Initiation',
      'Quarterly',
      'Stage review',
    ])
  })

  it('keeps a previously saved name that is not in the catalogue', () => {
    const options = periodSelectOptions(
      [{ period_name: 'Planning' }],
      'Ad hoc review',
    )
    expect(options[0]).toEqual({ value: 'Ad hoc review', label: 'Ad hoc review' })
    expect(options[1].label).toBe('Planning')
  })
})
