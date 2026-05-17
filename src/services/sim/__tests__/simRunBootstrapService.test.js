import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simDb } from '../../supabase/supabaseClient'
import { assignNPCCharacters } from '../simRunBootstrapService'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
  },
}))

describe('simRunBootstrapService', () => {
  beforeEach(() => {
    vi.mocked(simDb.from).mockReset()
  })

  it('assignNPCCharacters inserts one row per NPC role except user role', async () => {
    const roles = [
      'project_sponsor',
      'programme_manager',
      'project_manager',
      'team_manager',
      'project_assurance',
      'change_authority',
      'quality_assurance',
      'team_member',
      'project_board_member',
    ]
    const chars = roles.map((role_name, i) => ({ id: `npc-${i}`, role_name }))
    const insert = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(simDb.from).mockImplementation((table) => {
      if (table === 'npc_characters') {
        return {
          select: vi.fn().mockResolvedValue({ data: chars, error: null }),
        }
      }
      if (table === 'npc_run_assignments') {
        return { insert }
      }
      return {}
    })

    const r = await assignNPCCharacters('run-1', 'project_manager')
    expect(r.success).toBe(true)
    expect(insert).toHaveBeenCalledTimes(1)
    const rows = insert.mock.calls[0][0]
    expect(rows.every((row) => row.role_name !== 'project_manager')).toBe(true)
    expect(rows.length).toBe(roles.length - 1)
  })
})
