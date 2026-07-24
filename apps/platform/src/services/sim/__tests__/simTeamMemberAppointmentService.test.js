import { describe, it, expect, vi } from 'vitest'

vi.mock('../../supabaseClient', () => ({
  simDb: { from: vi.fn(), rpc: vi.fn() },
}))

describe('simTeamMemberAppointmentService', () => {
  it('exports team appointment helpers', async () => {
    const mod = await import('../simTeamMemberAppointmentService')
    expect(typeof mod.listSimTeamMemberAppointments).toBe('function')
    expect(typeof mod.createSimTeamMemberAppointment).toBe('function')
  })
})
