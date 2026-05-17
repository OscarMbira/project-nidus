import { describe, it, expect } from 'vitest'
import { scoreHighlightReportSubmission } from '../simNPCMessageService'

describe('simNPCMessageService', () => {
  it('scoreHighlightReportSubmission rewards timeliness when on time', () => {
    const r = scoreHighlightReportSubmission(10, 0, 14)
    expect(r.score).toBeGreaterThan(80)
    expect(r.timeliness).toBe(90)
  })

  it('scoreHighlightReportSubmission penalizes late reports', () => {
    const r = scoreHighlightReportSubmission(30, 0, 14)
    expect(r.timeliness).toBeLessThan(90)
    expect(r.score).toBeLessThan(scoreHighlightReportSubmission(10, 0, 14).score)
  })
})
