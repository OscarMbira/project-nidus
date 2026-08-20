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
    resolveProjectRouteKeyFromId.mockResolvedValue(null)

    const { result } = renderHook(() => usePlatformProjectId(), {
      wrapper: wrapper(`/pm/controls/issue-register?projectId=${UUID}`),
    })

    await waitFor(() => {
      expect(resolveProjectRouteKeyFromId).toHaveBeenCalledWith(UUID)
    })
    expect(result.current.projectId).toBe(UUID)
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
