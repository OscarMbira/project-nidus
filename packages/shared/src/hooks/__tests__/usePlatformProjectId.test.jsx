/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// packages/shared's vitest config has no jsdom setupFiles — RTL's auto-cleanup isn't wired up
// globally, so do it explicitly here (same pattern as useSuccessModal.test.jsx).
afterEach(cleanup)

const resolveProjectIdFromRouteSegment = vi.fn()
const resolveProjectRouteKeyFromId = vi.fn()
const readCurrentPmProjectId = vi.fn()

vi.mock('@nidus/shared/utils/projectRouteParam', () => ({
  decodeProjectRouteSegment: (v) => (v == null || v === '' ? '' : decodeURIComponent(String(v).trim())),
  looksLikeProjectUuid: (s) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '').trim()),
  resolveProjectIdFromRouteSegment: (...a) => resolveProjectIdFromRouteSegment(...a),
  resolveProjectRouteKeyFromId: (...a) => resolveProjectRouteKeyFromId(...a),
}))

vi.mock('@nidus/shared/utils/currentProjectStorage', () => ({
  readCurrentPmProjectId: (...a) => readCurrentPmProjectId(...a),
}))

import { useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '../usePlatformProjectId.js'

const UUID = 'd880e846-f08e-4c1a-83c4-fd51d1db2b70'

function wrapper(initialPath) {
  return function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/pm/controls/issue-register" element={children} />
        </Routes>
      </MemoryRouter>
    )
  }
}

describe('usePlatformProjectId — address-bar normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readCurrentPmProjectId.mockReturnValue(null)
  })

  it('rewrites a raw-UUID ?projectId= to the resolved project_code', async () => {
    resolveProjectRouteKeyFromId.mockResolvedValue('PRJ-0001')
    // After the address-bar rewrite, `decoded` becomes 'PRJ-0001' and the primary resolution
    // effect re-runs with the new (non-UUID) value — round-trips back to the same project.
    resolveProjectIdFromRouteSegment.mockResolvedValue(UUID)

    const { result } = renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper(`/pm/controls/issue-register?projectId=${UUID}`),
    })

    await waitFor(() => {
      expect(resolveProjectRouteKeyFromId).toHaveBeenCalledWith(UUID)
    })

    // Resolved UUID for API calls is unaffected by the address-bar rewrite.
    await waitFor(() => {
      expect(result.current.projectId).toBe(UUID)
    })
  })

  it('does not call resolveProjectRouteKeyFromId when ?projectId= is already a code', async () => {
    resolveProjectIdFromRouteSegment.mockResolvedValue(UUID)

    renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper('/pm/controls/issue-register?projectId=PRJ-0001'),
    })

    await waitFor(() => {
      expect(resolveProjectIdFromRouteSegment).toHaveBeenCalledWith('PRJ-0001')
    })
    expect(resolveProjectRouteKeyFromId).not.toHaveBeenCalled()
  })

  it('no-ops when the UUID has no resolvable project_code', async () => {
    resolveProjectIdFromRouteSegment.mockResolvedValue(UUID)
    resolveProjectRouteKeyFromId.mockResolvedValue(null)

    const { result } = renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper(`/pm/controls/issue-register?projectId=${UUID}`),
    })

    await waitFor(() => {
      expect(result.current.projectId).toBe(UUID)
    })
    expect(result.current.routeKey).toBe(UUID)
  })

  it('ignores a ?projectId= that is not a project and uses the open project', async () => {
    const assumptionId = '51ee211a-c0ca-4149-9562-11bce3eb25a9'
    readCurrentPmProjectId.mockReturnValue(UUID)
    resolveProjectIdFromRouteSegment.mockImplementation(async (segment) => {
      if (segment === assumptionId) return null
      if (segment === UUID) return UUID
      return null
    })
    resolveProjectRouteKeyFromId.mockImplementation(async (segment) => {
      if (segment === UUID) return 'SEED334-PRJ-08'
      return segment
    })

    const { result } = renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper(`/pm/controls/issue-register?projectId=${assumptionId}`),
    })

    await waitFor(() => {
      expect(result.current.projectId).toBe(UUID)
    })
    expect(result.current.routeKey).toBe('SEED334-PRJ-08')
  })

  it('writes the resolved project into a bare URL with no ?projectId= at all (v1190 fix)', async () => {
    // No ?projectId=, no entityType=project — resolved purely via the localStorage fallback
    // (readCurrentPmProjectId), e.g. a bare /platform/timesheets sidebar link. Before the fix,
    // the write-back effect's `!qp` guard skipped this case entirely, so sibling components
    // reading ?projectId= directly (PlanningProjectBar) never learned which project was resolved
    // and showed an empty "Select a project…" picker despite the page having real data loaded.
    readCurrentPmProjectId.mockReturnValue(UUID)
    resolveProjectIdFromRouteSegment.mockImplementation(async (segment) => (segment === UUID ? UUID : null))
    resolveProjectRouteKeyFromId.mockResolvedValue('SEED334-PRJ-08')

    const { result } = renderHook(
      () => {
        const projectId = usePlatformProjectId()
        const [searchParams] = useSearchParams()
        return { ...projectId, urlProjectId: searchParams.get('projectId') }
      },
      { wrapper: wrapper('/pm/controls/issue-register') }
    )

    await waitFor(() => {
      expect(result.current.projectId).toBe(UUID)
    })
    expect(result.current.routeKey).toBe('SEED334-PRJ-08')
    // The real bug: ?projectId= must actually land in the URL so sibling components reading it
    // directly (PlanningProjectBar) see the resolved project too.
    await waitFor(() => {
      expect(result.current.urlProjectId).toBe('SEED334-PRJ-08')
    })
  })

  it('does not touch entityId/entityType=project (handled elsewhere per v864)', async () => {
    resolveProjectIdFromRouteSegment.mockResolvedValue(UUID)

    renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper(`/pm/controls/issue-register?entityType=project&entityId=${UUID}`),
    })

    await waitFor(() => {
      expect(resolveProjectIdFromRouteSegment).not.toHaveBeenCalled()
    })
    expect(resolveProjectRouteKeyFromId).not.toHaveBeenCalled()
  })
})
