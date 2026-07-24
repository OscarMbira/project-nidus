import { describe, expect, it, vi, beforeEach } from 'vitest'
import { annotateTemplateRowsByMethodology } from '../methodologyMenuUtils.js'

describe('annotateTemplateRowsByMethodology', () => {
  it('keeps common (null methodology) enabled', () => {
    const rows = annotateTemplateRowsByMethodology(
      [{ id: 1, methodology: null }, { id: 2, methodology: '' }],
      new Set(['structured']),
    )
    expect(rows.every((r) => r.disabled === false)).toBe(true)
  })

  it('disables non-matching tracks but keeps rows', () => {
    const rows = annotateTemplateRowsByMethodology(
      [
        { id: 1, name: 'A', methodology: 'agile' },
        { id: 2, name: 'B', methodology: 'structured' },
      ],
      new Set(['structured']),
    )
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === 1).disabled).toBe(true)
    expect(rows.find((r) => r.id === 1).disabledReason).toMatch(/Not for your methodology/)
    expect(rows.find((r) => r.id === 2).disabled).toBe(false)
  })

  it('maps legacy pmbok to standards_based', () => {
    const rows = annotateTemplateRowsByMethodology(
      [{ id: 1, methodology: 'pmbok' }],
      new Set(['standards_based']),
    )
    expect(rows[0].disabled).toBe(false)
  })
})
