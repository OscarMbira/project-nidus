import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Download, Smartphone } from 'lucide-react'
import {
  canInstallPWA,
  isAppInstalled,
  isIOSDevice,
  isAndroidDevice,
  getIOSInstallInstructions,
  getAndroidInstallInstructions,
} from '../utils/pwaUtils'

const VISIT_KEY = 'pwa-distinct-paths'
const DISMISS_KEY = 'pwa-install-dismissed'

function readVisitedPaths() {
  try {
    const raw = sessionStorage.getItem(VISIT_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr) : new Set()
  } catch {
    return new Set()
  }
}

export default function PWAInstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [visitCount, setVisitCount] = useState(0)

  useEffect(() => {
    if (isAppInstalled()) return

    const dismissedStorage = localStorage.getItem(DISMISS_KEY)
    if (dismissedStorage) {
      const dismissedDate = new Date(dismissedStorage)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        return
      }
    }

    const paths = readVisitedPaths()
    paths.add(location.pathname)
    sessionStorage.setItem(VISIT_KEY, JSON.stringify([...paths]))
    setVisitCount(paths.size)
  }, [location.pathname])

  useEffect(() => {
    if (isAppInstalled()) return

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (isAppInstalled()) return
    if (isIOSDevice()) return
    const dismissedStorage = localStorage.getItem(DISMISS_KEY)
    if (dismissedStorage) {
      const dismissedDate = new Date(dismissedStorage)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return
    }
    if (visitCount >= 3) setShowPrompt(true)
  }, [visitCount])

  useEffect(() => {
    if (isAppInstalled()) return
    if (!isIOSDevice()) return
    const dismissedStorage = localStorage.getItem(DISMISS_KEY)
    if (dismissedStorage) {
      const dismissedDate = new Date(dismissedStorage)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return
    }
    const t = setTimeout(() => setShowPrompt(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowPrompt(false)
      } else {
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
  }

  if (!showPrompt || dismissed || isAppInstalled()) {
    return null
  }

  const isIOS = isIOSDevice()
  const isAndroid = isAndroidDevice()
  const iosInstructions = getIOSInstallInstructions()
  const androidInstructions = getAndroidInstallInstructions()

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[26rem] z-50 animate-slide-up">
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-4 text-gray-100">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-900/40 rounded-lg flex items-center justify-center border border-blue-700/50">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">
              Install Project Nidus
            </h3>
            {isIOS ? (
              <div className="text-xs text-gray-400 mb-3 space-y-2">
                <p>On iPhone or iPad, use Safari:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Tap the Share icon (square with arrow).</li>
                  <li>Scroll and tap &quot;Add to Home Screen&quot;.</li>
                  <li>Confirm the name, then tap Add.</li>
                </ol>
                <p className="text-gray-500">{iosInstructions.safari}</p>
              </div>
            ) : isAndroid ? (
              <div className="text-xs text-gray-400 mb-3 space-y-2">
                <p className="text-gray-300">Android — try one of these:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-gray-300">Chrome:</span> {androidInstructions.chrome}</li>
                  <li><span className="text-gray-300">Edge:</span> {androidInstructions.edge}</li>
                  <li><span className="text-gray-300">Samsung Internet:</span> Menu → Add page to → Home screen.</li>
                </ul>
              </div>
            ) : (
              <div className="text-xs text-gray-400 mb-3 space-y-2">
                <p className="text-gray-300">Desktop — Chrome or Edge:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Look for the install icon in the address bar, or open the menu → Install this site as an app.</li>
                </ul>
                <p>
                  Install for faster access and an app-like window. You can also open App settings from your profile menu.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {!isIOS && deferredPrompt && canInstallPWA() && (
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-700 text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-600"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-500 hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
