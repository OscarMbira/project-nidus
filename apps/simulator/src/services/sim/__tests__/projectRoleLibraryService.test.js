/**
 * "Add from Built-in Roles" service tests (v1105, Simulator).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSimDb } = vi.hoisted(() => {
  function makeBuilder(result) {
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: (resolve) => Promise.resolve(result).then(resolve),
    }
    return builder
  }
  return {
    mockSimDb: {
      from: vi.fn(() => makeBuilder({ data: [], error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../../supabase/supabaseClient', () => ({ simDb: mockSimDb }))

const mockGetCloneSourceRoles = vi.fn()
const mockFillOrgCustomRoleSkillsIfBlank = vi.fn()
vi.mock('../../organisationCustomRoleService', () => ({
  getCloneSourceRoles: (...args) => mockGetCloneSourceRoles(...args),
  fillOrgCustomRoleSkillsIfBlank: (...args) => mockFillOrgCustomRoleSkillsIfBlank(...args),
}))

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(() => Promise.resolve('account-1')),
}))

import { listRoleLibrary, addRolesFromLibrary } from '../projectRoleLibraryService'

describe('projectRoleLibraryService (Simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listRoleLibrary delegates to getCloneSourceRoles for the resolved account', async () => {
    mockGetCloneSourceRoles.mockResolvedValueOnce({ success: true, data: [{ id: 'r1', role_display_name: 'Actuary' }], error: null })
    const result = await listRoleLibrary()
    expect(mockGetCloneSourceRoles).toHaveBeenCalledWith('account-1')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('addRolesFromLibrary rejects picks with no skills', async () => {
    const result = await addRolesFromLibrary('practice-project-1', [{ projectRoleId: 'r1', roleName: 'Actuary', skills: '' }])
    expect(result.success).toBe(false)
  })

  it('addRolesFromLibrary inserts a new catalog row for a fresh pick', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: [], error: null })) // existing rows lookup
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null })) // max sort_order
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null })) // insert

    const result = await addRolesFromLibrary('practice-project-1', [
      { projectRoleId: 'r1', roleName: 'Actuary', skills: 'Statistical Risk Modelling', isCustom: false },
    ])
    expect(result.success).toBe(true)
    expect(result.added).toBe(1)
    expect(mockFillOrgCustomRoleSkillsIfBlank).not.toHaveBeenCalled()
  })

  it('addRolesFromLibrary skips a role already active in the catalog', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: [{ id: 'x1', role_label: 'Actuary', is_active: true }], error: null }))
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))

    const result = await addRolesFromLibrary('practice-project-1', [
      { projectRoleId: 'r1', roleName: 'Actuary', skills: 'Statistical Risk Modelling', isCustom: false },
    ])
    expect(result.success).toBe(true)
    expect(result.added).toBe(0)
  })

  it('addRolesFromLibrary backfills a custom role\'s skills when the pick is a custom org role', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    mockFillOrgCustomRoleSkillsIfBlank.mockResolvedValueOnce({ success: true, filled: true, error: null })

    const result = await addRolesFromLibrary('practice-project-1', [
      { projectRoleId: 'r2', roleName: 'Regional Delivery Lead', skills: 'Stakeholder Communication', isCustom: true },
    ])
    expect(result.success).toBe(true)
    expect(mockFillOrgCustomRoleSkillsIfBlank).toHaveBeenCalledWith('r2', 'Stakeholder Communication')
  })
})
