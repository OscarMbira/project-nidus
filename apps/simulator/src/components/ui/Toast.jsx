import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const colors = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
}

export function Toast({ toast, onRemove }) {
  const Icon = icons[toast.type] || Info
  const colorClasses = colors[toast.type] || colors.info

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id, onRemove])

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        min-w-[300px] max-w-[500px]
        animate-in slide-in-from-top-5 fade-in
        ${colorClasses}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {toast.title && (
          <h4 className="font-semibold mb-1">{toast.title}</h4>
        )}
        <p className="text-sm">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer

