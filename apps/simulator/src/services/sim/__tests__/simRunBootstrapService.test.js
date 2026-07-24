import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simDb } from '../../supabase/supabaseClient'
import { assignNPCCharacters } from '../simRunBootstrapService'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
  },
}))

// Mirrors packages/shared/src/constants/simulatorRoles.js ROLE_NPC_MAPPING —
// assignNPCCharacters filters by this (v734 Phase 8), not "every NPC role
// except the user's own." Kept local rather than imported so this test
// fails loudly if the mapping and the implementation ever drift apart,
// instead of silently testing against whatever the mapping currently says.
const EXPECTED_NPC_ROLES = {
  project_manager: ['team_member', 'team_manager', 'project_sponsor', 'quality_assurance', 'change_authority'],
  programme_manager: ['project_manager', 'project_sponsor', 'project_board_member', 'change_authority'],
  portfolio_manager: ['programme_manager', 'project_sponsor', 'project_board_member', 'change_authority'],
}

const ALL_NPC_ROLES = [
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

function mockNpcCharacters(insert) {
  const chars = ALL_NPC_ROLES.map((role_name, i) => ({ id: `npc-${i}`, role_name }))
  vi.mocked(simDb.from).mockImplementation((table) => {
    if (table === 'npc_characters') {
      return { select: vi.fn().mockResolvedValue({ data: chars, error: null }) }
    }
    if (table === 'npc_run_assignments') {
      return { insert }
    }
    return {}
  })
}

describe('simRunBootstrapService', () => {
  beforeEach(() => {
    vi.mocked(simDb.from).mockReset()
  })

  describe.each(Object.entries(EXPECTED_NPC_ROLES))('assignNPCCharacters for userRole=%s', (userRole, expectedRoles) => {
    it(`inserts exactly this role's NPC set (${expectedRoles.length} of ${ALL_NPC_ROLES.length} NPC types) — not every role except the user's own`, async () => {
      const insert = vi.fn().mockResolvedValue({ error: null })
      mockNpcCharacters(insert)

      const r = await assignNPCCharacters('run-1', userRole)

      expect(r.success).toBe(true)
      expect(insert).toHaveBeenCalledTimes(1)
      const rows = insert.mock.calls[0][0]
      const insertedRoles = rows.map((row) => row.role_name).sort()
      expect(insertedRoles).toEqual([...expectedRoles].sort())
      expect(rows.length).toBe(expectedRoles.length)
      // The user's own role is never an NPC they interact with as themselves.
      expect(insertedRoles).not.toContain(userRole)
    })
  })

  it('returns success with zero assignments (not an error) when no npc_characters rows match the role mapping', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(simDb.from).mockImplementation((table) => {
      if (table === 'npc_characters') return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      if (table === 'npc_run_assignments') return { insert }
      return {}
    })

    const r = await assignNPCCharacters('run-1', 'project_manager')
    expect(r).toEqual({ success: true, error: null, count: 0 })
    expect(insert).not.toHaveBeenCalled() // insert is skipped entirely for an empty rows array
  })

  it('propagates a query error from npc_characters', async () => {
    vi.mocked(simDb.from).mockImplementation((table) => {
      if (table === 'npc_characters') return { select: vi.fn().mockResolvedValue({ data: null, error: { message: 'connection lost' } }) }
      return {}
    })

    const r = await assignNPCCharacters('run-1', 'project_manager')
    expect(r).toEqual({ success: false, error: 'connection lost' })
  })
})
