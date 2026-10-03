import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

import { createTeam } from '../teamService'

function insertChain(result) {
  const api = {
    insert: vi.fn(() => api),
    select: vi.fn(() => api),
    single: vi.fn(async () => result),
  }
  return api
}

describe('createTeam', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('inserts a team with blank team_code and created_by', async () => {
    const api = insertChain({
      data: { id: 't1', team_name: 'Alpha', team_code: 'TEAM-0001' },
      error: null,
    })
    fromMock.mockReturnValue(api)

    const res = await createTeam({
      project_id: 'p1',
      team_name: 'Alpha',
      team_description: 'Desc',
      team_type: 'delivery',
      team_lead_user_id: null,
      max_team_size: 8,
      required_skills: 'React\nSQL',
      created_by: 'u1',
    })

    expect(fromMock).toHaveBeenCalledWith('teams')
    expect(api.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p1',
        team_name: 'Alpha',
        team_code: '',
        created_by: 'u1',
        is_active: true,
        max_team_size: 8,
        required_skills: 'React\nSQL',
      }),
    )
    expect(res.success).toBe(true)
    expect(res.data.team_code).toBe('TEAM-0001')
  })

  it('returns error on insert failure', async () => {
    const api = insertChain({ data: null, error: { message: 'denied' } })
    fromMock.mockReturnValue(api)
    const res = await createTeam({ project_id: 'p1', team_name: 'X' })
    expect(res.success).toBe(false)
    expect(res.error).toBe('denied')
  })
})
