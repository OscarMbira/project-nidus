import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isManagerAppointmentRole,
  normalizeManagerRoleName,
} from '../../utils/appointmentRoleUtils'

vi.mock('../supabaseClient', () => ({
  platformDb: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('appointmentRoleUtils (manager)', () => {
  it('detects manager roles', () => {
    expect(isManagerAppointmentRole('project_manager')).toBe(true)
    expect(isManagerAppointmentRole('team_member')).toBe(false)
  })

  it('normalizes pm aliases', () => {
    expect(normalizeManagerRoleName('pm_project_manager')).toBe('project_manager')
  })
})

describe('managerAppointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports createManagerAppointment', async () => {
    const mod = await import('../managerAppointmentService')
    expect(typeof mod.createManagerAppointment).toBe('function')
    expect(typeof mod.acceptManagerAppointment).toBe('function')
  })
})
