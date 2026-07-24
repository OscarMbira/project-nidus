import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-[100] md:left-auto md:right-4 md:bottom-4 md:max-w-md p-4"
    >
      <div className="rounded-lg border border-gray-700 bg-gray-900 text-gray-100 shadow-xl p-4 flex gap-3 items-start">
        <RefreshCw className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">New version available</p>
          <p className="text-xs text-gray-400 mt-1">
            Reload to get the latest fixes and improvements. You can finish what you are doing first.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              onClick={() => {
                void updateServiceWorker(true)
              }}
            >
              Reload now
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-300 p-1"
          aria-label="Dismiss"
          onClick={() => setNeedRefresh(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
