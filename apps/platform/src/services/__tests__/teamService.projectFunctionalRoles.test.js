import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

import {
  listProjectFunctionalRoles,
  replaceProjectFunctionalRoles,
} from '../teamService'

function chainable(finalResult) {
  const api = {}
  const defer = () => api
  api.select = vi.fn(defer)
  api.eq = vi.fn(defer)
  api.order = vi.fn(defer)
  api.update = vi.fn(defer)
  api.insert = vi.fn(defer)
  api.then = (resolve, reject) => Promise.resolve(finalResult).then(resolve, reject)
  return api
}

describe('project functional roles (v1084)', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('listProjectFunctionalRoles requires project id', async () => {
    const res = await listProjectFunctionalRoles('')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/required/i)
  })

  it('listProjectFunctionalRoles queries active roles for project', async () => {
    const rows = [
      { id: 'r1', role_label: 'Developer', required_skills: 'JS', is_active: true },
    ]
    const api = chainable({ data: rows, error: null })
    fromMock.mockReturnValue(api)

    const res = await listProjectFunctionalRoles('proj-1')
    expect(fromMock).toHaveBeenCalledWith('project_functional_roles')
    expect(api.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    expect(api.eq).toHaveBeenCalledWith('is_active', true)
    expect(res.success).toBe(true)
    expect(res.data).toEqual(rows)
  })

  it('replaceProjectFunctionalRoles soft-deactivates removed labels', async () => {
    const existing = [
      { id: 'a', role_label: 'Keep', required_skills: 'A', is_active: true },
      { id: 'b', role_label: 'Drop', required_skills: null, is_active: true },
    ]
    const existingApi = chainable({ data: existing, error: null })
    const deactivateApi = chainable({ error: null })
    const updateKeepApi = chainable({ error: null })
    const listApi = chainable({
      data: [{ id: 'a', role_label: 'Keep', required_skills: 'A', is_active: true }],
      error: null,
    })

    fromMock
      .mockReturnValueOnce(existingApi)
      .mockReturnValueOnce(deactivateApi)
      .mockReturnValueOnce(updateKeepApi)
      .mockReturnValueOnce(listApi)

    const res = await replaceProjectFunctionalRoles('proj-1', [
      { role: 'Keep', skills: 'A' },
    ])

    expect(res.success).toBe(true)
    expect(deactivateApi.update).toHaveBeenCalled()
    expect(updateKeepApi.update).toHaveBeenCalled()
  })
})
