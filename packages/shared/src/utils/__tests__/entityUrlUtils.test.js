import { describe, it, expect, vi, beforeEach } from 'vitest'

const UUID = 'e550e840-e29b-41d4-a716-446655440000'
const PROJECT_UUID = 'd880e846-f08e-4c1a-83c4-fd51d1db2b70'

const resolveEntityId = vi.fn()
const getEntityCode = vi.fn()

vi.mock('../entityRouteParam.js', () => ({
  resolveEntityId: (...a) => resolveEntityId(...a),
  getEntityCode: (...a) => getEntityCode(...a),
}))

// entityUrlUtils.js -> projectRouteParam.js imports platformDb at module load time even though
// these tests never call the functions that use it — stub it so import doesn't throw for
// missing Supabase env config in the test environment.
vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const { projectUrl, projectQueryParam, riskUrl, issueUrl, programmeUrl } = await import('../entityUrlUtils.js')

describe('entityUrlUtils (generic-resolver-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('projectUrl uses code when UUID passed', async () => {
    getEntityCode.mockResolvedValue('PRJ-0001')
    await expect(projectUrl(UUID)).resolves.toMatch('/platform/projects/PRJ-0001')
    expect(getEntityCode).toHaveBeenCalledWith('project', UUID, undefined)
  })

  it('projectUrl passes a code straight through (no lookup)', async () => {
    await expect(projectUrl('PRJ-0001')).resolves.toBe('/platform/projects/PRJ-0001')
    expect(getEntityCode).not.toHaveBeenCalled()
  })

  it('projectQueryParam resolves code', async () => {
    getEntityCode.mockResolvedValue('PRJ-0001')
    await expect(projectQueryParam(UUID)).resolves.toBe('PRJ-0001')
  })

  it('riskUrl builds nested path from resolved project + risk codes', async () => {
    resolveEntityId.mockResolvedValue(PROJECT_UUID)
    getEntityCode.mockImplementation(async (type) => (type === 'project' ? 'PRJ-0001' : 'RISK-0004'))
    const u = await riskUrl('RISK-0004', 'PRJ-0001')
    expect(u).toBe('/platform/projects/PRJ-0001/risks/RISK-0004')
  })

  it('riskUrl falls back to /platform/projects when the project cannot be resolved', async () => {
    resolveEntityId.mockResolvedValue(null)
    const u = await riskUrl('RISK-0004', 'not-a-real-project')
    expect(u).toBe('/platform/projects')
  })

  it('issueUrl builds nested path from resolved project + issue codes', async () => {
    resolveEntityId.mockResolvedValue(PROJECT_UUID)
    getEntityCode.mockImplementation(async (type) => (type === 'project' ? 'PRJ-0001' : 'ISS-0005'))
    const u = await issueUrl('ISS-0005', 'PRJ-0001')
    expect(u).toBe('/platform/projects/PRJ-0001/issues/ISS-0005')
  })

  it('programmeUrl uses /platform/programme base', async () => {
    getEntityCode.mockResolvedValue('PROG-0002')
    const u = await programmeUrl(UUID, 'evm')
    expect(u).toBe('/platform/programme/PROG-0002/evm')
  })
})
