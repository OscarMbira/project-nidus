import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

const CHANNEL = 'nidus-pwa-sync'

/**
 * Offline awareness + optional BroadcastChannel listener for background sync completion.
 * Call from task/issue/risk forms so users know mutations may sync when back online.
 */
export function useOfflineQueue({ showOfflineToast = true } = {}) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const warnedRef = useRef(false)

  const onSyncMessage = useCallback((event) => {
    if (event?.data?.type === 'sync-success') {
      toast.success(event.data.message || 'Queued changes finished syncing.')
    }
  }, [])

  useEffect(() => {
    let ch
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        ch = new BroadcastChannel(CHANNEL)
        ch.addEventListener('message', onSyncMessage)
      }
    } catch {
      /* ignore */
    }

    const goOffline = () => {
      setIsOffline(true)
      if (showOfflineToast && !warnedRef.current) {
        warnedRef.current = true
        toast('You are offline — changes may be queued and will sync when you reconnect.', {
          duration: 5000,
        })
      }
    }
    const goOnline = () => {
      setIsOffline(false)
      warnedRef.current = false
      toast.success('You are back online.', { duration: 3000 })
    }

    if (!navigator.onLine) goOffline()
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (ch) {
        ch.removeEventListener('message', onSyncMessage)
        ch.close()
      }
    }
  }, [onSyncMessage, showOfflineToast])

  return { isOffline }
}

export { CHANNEL as OFFLINE_SYNC_CHANNEL }
