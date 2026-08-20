/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

afterEach(cleanup)

const resolveEntityId = vi.fn()
const getEntityCode = vi.fn()

vi.mock('../../utils/entityRouteParam.js', () => ({
  resolveEntityId: (...a) => resolveEntityId(...a),
  getEntityCode: (...a) => getEntityCode(...a),
}))

const { useEntityDetailParams } = await import('../useEntityDetailParams.js')

const PROJECT_UUID = 'd880e846-f08e-4c1a-83c4-fd51d1db2b70'
const REQ_UUID = 'e550e840-e29b-41d4-a716-446655440000'

function wrapper(initialPath, routePath) {
  return function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePath} element={children} />
        </Routes>
      </MemoryRouter>
    )
  }
}

describe('useEntityDetailParams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves project + entity codes to UUIDs and rewrites the address bar', async () => {
    resolveEntityId.mockImplementation(async (type) => (type === 'project' ? PROJECT_UUID : REQ_UUID))

    const { result } = renderHook(() => useEntityDetailParams('requirement', { entityParam: 'reqId' }), {
      wrapper: wrapper('/platform/projects/PRJ-0001/scope/requirements/REQ-0001', '/platform/projects/:projectId/scope/requirements/:reqId'),
    })

    await waitFor(() => {
      expect(result.current.projectId).toBe(PROJECT_UUID)
      expect(result.current.entityId).toBe(REQ_UUID)
    })
    expect(result.current.loading).toBe(false)
    // Already friendly — no self-correction call expected.
    expect(getEntityCode).not.toHaveBeenCalled()
  })

  it('resolves raw-UUID segments and self-corrects the URL to friendly codes', async () => {
    // Simulate real bidirectional resolution: a UUID passes through, but once the address bar
    // is corrected to the code, a subsequent render's lookup must resolve that code back to the
    // same UUID (not identity-passthrough, which would only hold for already-UUID segments).
    resolveEntityId.mockImplementation(async (type, key) => {
      if (key === PROJECT_UUID || key === 'PRJ-0001') return type === 'project' ? PROJECT_UUID : key
      if (key === REQ_UUID || key === 'REQ-0001') return type === 'requirement' ? REQ_UUID : key
      return key
    })
    getEntityCode.mockImplementation(async (type) => (type === 'project' ? 'PRJ-0001' : 'REQ-0001'))

    const { result } = renderHook(() => useEntityDetailParams('requirement', { entityParam: 'reqId' }), {
      wrapper: wrapper(
        `/platform/projects/${PROJECT_UUID}/scope/requirements/${REQ_UUID}`,
        '/platform/projects/:projectId/scope/requirements/:reqId',
      ),
    })

    await waitFor(() => {
      expect(result.current.projectId).toBe(PROJECT_UUID)
    })
    await waitFor(() => {
      expect(getEntityCode).toHaveBeenCalledWith('project', PROJECT_UUID)
      expect(getEntityCode).toHaveBeenCalledWith('requirement', REQ_UUID, PROJECT_UUID)
    })
  })

  it('treats the configured "new" value as a literal, not something to resolve', async () => {
    resolveEntityId.mockImplementation(async (type) => (type === 'project' ? PROJECT_UUID : null))

    const { result } = renderHook(() => useEntityDetailParams('requirement', { entityParam: 'reqId' }), {
      wrapper: wrapper('/platform/projects/PRJ-0001/scope/requirements/new', '/platform/projects/:projectId/scope/requirements/:reqId'),
    })

    await waitFor(() => {
      expect(result.current.projectId).toBe(PROJECT_UUID)
    })
    expect(result.current.entityId).toBe('new')
    expect(result.current.error).toBeNull()
  })

  it('reports missing when there is no project segment at all', async () => {
    const { result } = renderHook(() => useEntityDetailParams('requirement', { entityParam: 'reqId' }), {
      wrapper: wrapper('/platform/scope/requirements/REQ-0001', '/platform/scope/requirements/:reqId'),
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('missing')
  })
})
