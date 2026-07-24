import { describe, it, expect, vi } from 'vitest'

vi.mock('../../supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('simManagerAppointmentService', () => {
  it('exports appointment helpers', async () => {
    const mod = await import('../simManagerAppointmentService')
    expect(typeof mod.listSimManagerAppointments).toBe('function')
    expect(typeof mod.createSimManagerAppointment).toBe('function')
    expect(typeof mod.acceptSimManagerAppointment).toBe('function')
  })
})
