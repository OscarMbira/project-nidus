import { describe, it, expect } from 'vitest'
import {
  parseMeasurementTimingLinks,
  serializeMeasurementTimingLinks,
  parseMeasurementPoints,
  formatMeasurementTimingLinksForDisplay,
} from '../measurementTimingUtils.js'

describe('measurementTimingUtils', () => {
  it('parses measurement points from newline text', () => {
    expect(parseMeasurementPoints('A\nB\n\nC')).toEqual(['A', 'B', 'C'])
  })

  it('round-trips linked timing rows as JSON', () => {
    const rows = [
      { point: 'NPS uplift', timing: '90 days after go-live' },
      { point: 'Cost saving', timing: 'Quarterly finance report' },
    ]
    const stored = serializeMeasurementTimingLinks(rows)
    expect(JSON.parse(stored)).toEqual(rows)
    expect(parseMeasurementTimingLinks(stored)).toEqual(rows)
  })

  it('parses legacy plain timing lines', () => {
    expect(parseMeasurementTimingLinks('First review at 90 days\nSecond at 180 days')).toEqual([
      { point: '', timing: 'First review at 90 days' },
      { point: '', timing: 'Second at 180 days' },
    ])
  })

  it('formats pairs for display', () => {
    const stored = serializeMeasurementTimingLinks([
      { point: 'NPS', timing: '90 days' },
    ])
    expect(formatMeasurementTimingLinksForDisplay(stored)).toBe('NPS: 90 days')
  })
})
