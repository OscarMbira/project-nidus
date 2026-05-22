import { CheckCircle2, X } from 'lucide-react'

/**
 * Record-specific success message after CRUD operations.
 */
export default function CrudSuccessBanner({ message, recordId, operation, onDismiss }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-emerald-100"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-emerald-50">{message}</p>
        {(recordId || operation) && (
          <p className="mt-1 text-sm text-emerald-200/90">
            {operation && <span className="capitalize">{operation}</span>}
            {operation && recordId && ' · '}
            {recordId && <span className="font-mono text-xs">ID: {recordId}</span>}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-emerald-900/50 text-emerald-300"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
