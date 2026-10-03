import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const fromMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    rpc: (...args) => rpc(...args),
    from: (...args) => fromMock(...args),
  },
}))

import {
  setTeamChangeReason,
  clearTeamChangeReason,
  getTeamChangeHistory,
} from '../teamService'

describe('teamService change history helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('setTeamChangeReason calls RPC with trimmed reason', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await setTeamChangeReason('  rebalanced capacity  ')
    expect(res.success).toBe(true)
    expect(rpc).toHaveBeenCalledWith('set_team_change_reason', {
      p_reason: 'rebalanced capacity',
    })
  })

  it('clearTeamChangeReason calls clear RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await clearTeamChangeReason()
    expect(res.success).toBe(true)
    expect(rpc).toHaveBeenCalledWith('clear_team_change_reason')
  })

  it('getTeamChangeHistory maps actor and member profiles', async () => {
    const historyRows = [
      {
        id: 'h1',
        team_id: 't1',
        user_id: 'u-member',
        changed_by: 'u-actor',
        event_type: 'updated',
        changes: [{ field: 'allocation_percentage', old_value: '40', new_value: '70' }],
        change_reason: 'Phase 2 ramp',
        changed_at: '2026-09-19T10:00:00Z',
      },
    ]

    fromMock.mockImplementation((table) => {
      if (table === 'team_change_history') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: historyRows, error: null }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                { id: 'u-actor', full_name: 'Ada Admin', email: 'ada@example.com' },
                { id: 'u-member', full_name: 'Mo Member', email: 'mo@example.com' },
              ],
              error: null,
            }),
          }),
        }
      }
      return {}
    })

    const res = await getTeamChangeHistory('t1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0].changed_by_user.full_name).toBe('Ada Admin')
    expect(res.data[0].member_user.full_name).toBe('Mo Member')
    expect(res.data[0].change_reason).toBe('Phase 2 ramp')
  })
})
