import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineQueue, OFFLINE_SYNC_CHANNEL } from '../useOfflineQueue'

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reflects offline state when navigator goes offline', () => {
    const { result, rerender } = renderHook(() => useOfflineQueue({ showOfflineToast: false }))

    expect(result.current.isOffline).toBe(false)

    act(() => {
      vi.stubGlobal('navigator', { onLine: false })
      window.dispatchEvent(new Event('offline'))
    })
    rerender()
    expect(result.current.isOffline).toBe(true)
  })

  it('exports a stable channel name for sync messaging', () => {
    expect(OFFLINE_SYNC_CHANNEL).toBe('nidus-pwa-sync')
  })
})
