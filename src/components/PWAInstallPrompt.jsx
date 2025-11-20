import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { canInstallPWA, isAppInstalled, isIOSDevice, getIOSInstallInstructions } from '../utils/pwaUtils'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (isAppInstalled()) {
      return
    }

    // Check if already dismissed
    const dismissedStorage = localStorage.getItem('pwa-install-dismissed')
    if (dismissedStorage) {
      const dismissedDate = new Date(dismissedStorage)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show custom instructions after a delay
    if (isIOSDevice()) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  if (!showPrompt || dismissed || isAppInstalled()) {
    return null
  }

  const isIOS = isIOSDevice()
  const iosInstructions = getIOSInstallInstructions()

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Install Project Nidus
            </h3>
            {isIOS ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                <p className="mb-1">To install this app on your device:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{iosInstructions.safari}</li>
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Install our app for a better experience with offline support and faster access.
              </p>
            )}
            <div className="flex items-center gap-2">
              {!isIOS && deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

