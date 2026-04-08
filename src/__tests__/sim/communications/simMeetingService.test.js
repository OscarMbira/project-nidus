import { describe, it, expect } from 'vitest'

describe('simMeetingService', () => {
  it('exports listMeetingsForAccount', async () => {
    const mod = await import('../../../services/sim/communications/simMeetingService.js')
    expect(typeof mod.listMeetingsForAccount).toBe('function')
  })
})
