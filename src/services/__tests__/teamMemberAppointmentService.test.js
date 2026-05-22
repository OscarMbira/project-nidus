import { describe, it, expect, vi } from 'vitest'
import { isTeamMemberAppointmentRole } from '../../utils/appointmentRoleUtils'

vi.mock('../supabaseClient', () => ({
  platformDb: { auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
}))

describe('team member appointment roles', () => {
  it('detects team roles', () => {
    expect(isTeamMemberAppointmentRole('developer')).toBe(true)
    expect(isTeamMemberAppointmentRole('project_manager')).toBe(false)
  })
})

describe('teamMemberAppointmentService', () => {
  it('exports service functions', async () => {
    const mod = await import('../teamMemberAppointmentService')
    expect(typeof mod.createTeamMemberAppointment).toBe('function')
    expect(typeof mod.declineTeamMemberAppointment).toBe('function')
  })
})
