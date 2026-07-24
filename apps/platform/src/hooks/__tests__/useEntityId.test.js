import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const resolveProjectId = vi.fn()
const getProjectCode = vi.fn()

vi.mock('../../services/entityResolverService.js', () => ({
  resolveProjectId: (...a) => resolveProjectId(...a),
  resolveProgrammeId: vi.fn(),
  resolvePortfolioId: vi.fn(),
  resolveRiskId: vi.fn(),
  resolveIssueId: vi.fn(),
  resolveChangeRequestId: vi.fn(),
  resolveTeamId: vi.fn(),
  resolveScenarioId: vi.fn(),
  resolveSimRunId: vi.fn(),
  resolvePracticeProjectId: vi.fn(),
  getProjectCode: (...a) => getProjectCode(...a),
  getProgrammeCode: vi.fn(),
  getPortfolioCode: vi.fn(),
  getRiskCode: vi.fn(),
  getIssueCode: vi.fn(),
  getChangeRequestRef: vi.fn(),
  getTeamCode: vi.fn(),
  getScenarioCode: vi.fn(),
  getSimRunCode: vi.fn(),
  getPracticeProjectCode: vi.fn(),
}))

import { useEntityId } from '../useEntityId.js'

describe('useEntityId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves project code to uuid and code', async () => {
    resolveProjectId.mockResolvedValue('uuid-1')
    getProjectCode.mockResolvedValue('PRJ-0002')

    const { result } = renderHook(() => useEntityId('PRJ-0002', 'project'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(resolveProjectId).toHaveBeenCalledWith('PRJ-0002')
    expect(result.current.uuid).toBe('uuid-1')
    expect(result.current.code).toBe('PRJ-0002')
    expect(result.current.error).toBe(null)
  })

  it('UUID input skips resolveProjectId', async () => {
    const id = 'e550e840-e29b-41d4-a716-446655440000'
    getProjectCode.mockResolvedValue('PRJ-0099')

    const { result } = renderHook(() => useEntityId(id, 'project'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(resolveProjectId).not.toHaveBeenCalled()
    expect(result.current.uuid).toBe(id)
    expect(result.current.code).toBe('PRJ-0099')
  })

  it('returns missing error when param empty', async () => {
    const { result } = renderHook(() => useEntityId('', 'project'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('missing')
  })

  it('risk requires contextId', async () => {
    const { result } = renderHook(() => useEntityId('RISK-1', 'risk', undefined))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('missing_context')
  })
})
