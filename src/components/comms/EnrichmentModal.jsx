import { useState } from 'react'

export default function EnrichmentModal({ open, onClose, onSubmit, title = 'Enrich record', children }) {
  const [ownerId, setOwnerId] = useState('')
  const [due, setDue] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        {children}
        <div className="space-y-3 mt-4">
          <label className="block text-sm text-gray-600 dark:text-gray-400">
            Owner user ID (optional)
            <input
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-gray-600 dark:text-gray-400">
            Due date
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit?.({ ownerUserId: ownerId || null, dueDate: due || null })}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm"
          >
            Create in register
          </button>
        </div>
      </div>
    </div>
  )
}
