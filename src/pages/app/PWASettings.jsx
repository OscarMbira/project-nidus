import { useState, useEffect } from 'react'
import { Smartphone, Trash2, HardDrive, WifiOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import PushNotificationToggle from '../../components/pwa/PushNotificationToggle'
import {
  canInstallPWA,
  isAppInstalled,
  isIOSDevice,
  getIOSInstallInstructions,
  getAndroidInstallInstructions,
} from '../../utils/pwaUtils'

export default function PWASettings() {
  const [storage, setStorage] = useState({ usage: null, quota: null })
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorage({ usage: est.usage, quota: est.quota })
      })
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const formatBytes = (n) => {
    if (n == null) return '—'
    if (n < 1024) return `${n} B`
    const kb = n / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const clearCaches = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      toast.success('Caches cleared. Reload the page to fetch fresh assets.')
    } catch (e) {
      toast.error(e?.message || 'Could not clear caches.')
    }
  }

  const runInstall = async () => {
    if (!deferredPrompt) {
      toast(
        import.meta.env.DEV
          ? 'Install prompt is not available in local dev (no service worker). Build and run preview, or use the browser’s install icon / menu.'
          : 'No install prompt from the browser yet. Use the address-bar install icon or the menu (Install app), or try again after a full reload.',
        { duration: 6000 }
      )
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') toast.success('Installation started.')
  }

  const installed = isAppInstalled()
  const ios = isIOSDevice()
  const iosHelp = getIOSInstallInstructions()
  const androidHelp = getAndroidInstallInstructions()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-blue-500" />
            App &amp; install
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Progressive Web App settings for this device. Works for both Platform and Simulator routes.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Install</h2>
          {installed ? (
            <p className="text-sm text-green-600 dark:text-green-400">App appears to be installed (standalone mode).</p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {canInstallPWA() ? 'You can install Project Nidus for quicker access.' : 'Installation may be available from the browser menu on this device.'}
            </p>
          )}
          {import.meta.env.DEV && (
            <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-3 py-2">
              <strong className="font-semibold">Local development:</strong> the service worker is turned off here, so the browser will not offer the in-page install prompt. To test install, run{' '}
              <code className="text-[0.7rem] bg-amber-500/20 px-1 rounded">npm run build</code> then{' '}
              <code className="text-[0.7rem] bg-amber-500/20 px-1 rounded">npm run preview</code>, or rely on the manual steps below.
            </p>
          )}
          {!ios && (
            <button
              type="button"
              onClick={() => void runInstall()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Install or prompt install
            </button>
          )}
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 border-t border-gray-200 dark:border-gray-600 pt-3">
            <p><strong className="text-gray-800 dark:text-gray-200">iOS (Safari):</strong> {iosHelp.safari}</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Android (Chrome):</strong> {androidHelp.chrome}</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Android (Edge):</strong> {androidHelp.edge}</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Desktop (Chrome / Edge):</strong> Use the install icon in the address bar or Menu → Install app.</p>
          </div>
        </section>

        <PushNotificationToggle />

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Connection
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {online ? 'You appear to be online.' : 'You appear to be offline. Queued writes may sync when you reconnect.'}
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Background sync</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Failed saves to tasks, issues, risks, and defects may be retried automatically in supported browsers when you are back online.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage (this origin)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Used: {formatBytes(storage.usage)} / Quota: {formatBytes(storage.quota)}
          </p>
          <button
            type="button"
            onClick={() => void clearCaches()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear caches
          </button>
        </section>
      </div>
    </div>
  )
}
