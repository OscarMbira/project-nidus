import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGet = vi.hoisted(() => vi.fn())
const mockEnsure = vi.hoisted(() => vi.fn())

vi.mock('../api/invitationTemplatesApi', () => ({
  getTemplatesForAccount: (...a) => mockGet(...a),
  ensureTemplatesForAccount: (...a) => mockEnsure(...a),
}))

import { useInvitationTemplates, invalidateInvitationTemplatesCache } from './useInvitationTemplates'

describe('useInvitationTemplates', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockEnsure.mockReset()
    sessionStorage.clear()
    mockGet.mockResolvedValue({
      success: true,
      data: [
        { id: '1', role_name: 'team_member', message_body: 'Hi', is_active: true },
        { id: '2', role_name: 'project_manager', message_body: 'PM', is_active: false },
      ],
      error: null,
    })
    mockEnsure.mockResolvedValue({ success: true, inserted: 0, error: null })
  })

  it('getTemplateForRole returns active DB template when present', async () => {
    const { result } = renderHook(() =>
      useInvitationTemplates({ accountId: 'acc-1', authUserId: null, prefetchEnsure: false }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getTemplateForRole('team_member')?.message_body).toBe('Hi')
    expect(result.current.getTemplateForRole('project_manager')).toBeNull()
  })

  it('getTemplateForRole falls back to seeded defaults when no DB row', async () => {
    invalidateInvitationTemplatesCache('acc-empty')
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      error: null,
    })
    const { result } = renderHook(() =>
      useInvitationTemplates({ accountId: 'acc-empty', authUserId: null, prefetchEnsure: false }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    const pm = result.current.getTemplateForRole('project_manager')
    expect(pm?.message_body).toBeTruthy()
    expect(pm.message_body).toContain('{{project_name}}')
  })

  it('uses session cache on second mount', async () => {
    invalidateInvitationTemplatesCache('acc-1')
    mockGet.mockClear()
    const { result, unmount } = renderHook(() =>
      useInvitationTemplates({ accountId: 'acc-1', authUserId: null, prefetchEnsure: false }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledTimes(1)
    unmount()
    const { result: r2 } = renderHook(() =>
      useInvitationTemplates({ accountId: 'acc-1', authUserId: null, prefetchEnsure: false }),
    )
    await waitFor(() => expect(r2.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('prefetchEnsure calls ensure before get', async () => {
    invalidateInvitationTemplatesCache('acc-1')
    const order = []
    mockEnsure.mockImplementation(async () => {
      order.push('ensure')
      return { success: true, inserted: 1, error: null }
    })
    mockGet.mockImplementation(async () => {
      order.push('get')
      return {
        success: true,
        data: [{ id: '1', role_name: 'team_member', is_active: true }],
        error: null,
      }
    })
    const { result } = renderHook(() =>
      useInvitationTemplates({ accountId: 'acc-1', authUserId: 'uid', prefetchEnsure: true }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(order).toEqual(['ensure', 'get'])
  })
})
