import { describe, it, expect } from 'vitest'

describe('meetingSummaryService', () => {
  it('exports runMeetingAiExtraction', async () => {
    const mod = await import('../../services/communications/meetingSummaryService.js')
    expect(typeof mod.runMeetingAiExtraction).toBe('function')
  })
})
