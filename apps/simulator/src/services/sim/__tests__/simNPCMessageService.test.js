import { describe, it, expect, vi } from 'vitest'

// simNPCMessageService.js imports simDb at module scope (unused by the pure
// scoring function under test here) — without a mock, evaluating the real
// supabaseClient.js crashes with "window is not defined" in this
// non-browser test environment. Matches the standard mock pattern used
// everywhere else in this directory.
vi.mock('../../supabase/supabaseClient', () => ({
  simDb: { from: vi.fn(), rpc: vi.fn() },
}))

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
