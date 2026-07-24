import { describe, it, expect } from 'vitest'

describe('simMeetingExtractionService', () => {
  it('exports listPendingForCurrentUser', async () => {
    const mod = await import('../../../services/sim/communications/simMeetingExtractionService.js')
    expect(typeof mod.listPendingForCurrentUser).toBe('function')
  })
})
