import { describe, it, expect } from 'vitest'

describe('meetingService', () => {
  it('exports listMeetingsForAccount', async () => {
    const mod = await import('../../services/communications/meetingService.js')
    expect(typeof mod.listMeetingsForAccount).toBe('function')
  })
})
