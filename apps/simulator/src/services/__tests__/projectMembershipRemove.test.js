import { describe, it, expect, vi, beforeEach } from 'vitest'

// v1343 / SQL v1472: removing a member goes through remove_project_member (the database checks
// who may remove and which role); no direct table updates.
const rpc = vi.fn()
const from = vi.fn()
vi.mock('../supabase/supabaseClient', () => ({ appDb: { rpc: (...a) => rpc(...a), from: (...a) => from(...a) } }))
vi.mock('../organisationRoleService', () => ({ isPmoAdmin: vi.fn() }))

const { removeMemberFromProject, removePlatformProjectMember } = await import('../projectMembershipService')

beforeEach(() => {
  rpc.mockReset()
  from.mockReset()
})

describe('remove project member (v1343)', () => {
  it('a membership row is removed through the RPC', async () => {
    rpc.mockResolvedValue({ data: { project_id: 'p1', role_name: 'team_member' }, error: null })
    const res = await removeMemberFromProject('m1')
    expect(rpc).toHaveBeenCalledWith('remove_project_member', { p_membership_id: 'm1' })
    expect(from).not.toHaveBeenCalled()
    expect(res.success).toBe(true)
  })

  it('a project-scoped user_roles row (ur-…) is removed through the RPC', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    const res = await removePlatformProjectMember('ur-u9')
    expect(rpc).toHaveBeenCalledWith('remove_project_member', { p_user_role_id: 'u9' })
    expect(res.success).toBe(true)
  })

  it('a refusal from the database comes back as an error (e.g. PA removing a Team Manager)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Forbidden: you cannot remove a member with the role team_manager' } })
    const res = await removePlatformProjectMember('m2')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Forbidden/)
  })
})
