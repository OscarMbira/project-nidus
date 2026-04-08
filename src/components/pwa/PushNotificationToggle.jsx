import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import {
  getVapidPublicKey,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../services/pushNotificationService'
import { requestNotificationPermission } from '../../utils/pwaUtils'

export default function PushNotificationToggle() {
  const [ready, setReady] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const vapidConfigured = !!getVapidPublicKey()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const on = await isPushSubscribed()
        if (!cancelled) {
          setSubscribed(on)
          setReady(true)
        }
      } catch {
        if (!cancelled) setReady(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = async () => {
    setError(null)
    setLoading(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        const perm = await requestNotificationPermission()
        if (perm !== 'granted') {
          setError('Notification permission was not granted.')
          return
        }
        await subscribeToPush()
        setSubscribed(true)
      }
    } catch (e) {
      setError(e?.message || 'Could not update notification subscription.')
    } finally {
      setLoading(false)
    }
  }

  if (!vapidConfigured) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Push notifications are not configured yet (missing <code className="text-xs">VITE_VAPID_PUBLIC_KEY</code>).
      </p>
    )
  }

  if (!ready && !('PushManager' in window)) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Push notifications are not supported in this browser.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {subscribed ? (
            <Bell className="h-5 w-5 text-blue-400 shrink-0" aria-hidden />
          ) : (
            <BellOff className="h-5 w-5 text-gray-500 shrink-0" aria-hidden />
          )}
          <div>
            <p className="text-sm font-medium">Browser push</p>
            <p className="text-xs text-gray-400">
              Opt in to receive push messages when your admin enables them.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void toggle()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {subscribed ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-400 mt-2">{error}</p> : null}
    </div>
  )
}
