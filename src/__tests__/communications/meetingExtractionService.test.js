import { describe, it, expect } from 'vitest'

describe('meetingExtractionService', () => {
  it('exports listAllPendingForAccount', async () => {
    const mod = await import('../../services/communications/meetingExtractionService.js')
    expect(typeof mod.listAllPendingForAccount).toBe('function')
  })
})
