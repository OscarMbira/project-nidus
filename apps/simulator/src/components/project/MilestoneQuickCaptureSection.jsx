import { useState } from 'react'
import { Plus, Trash2, Flag } from 'lucide-react'

/**
 * Quick-capture list of main milestones identified during project setup, before roles are
 * assigned — captured for audit information. Assigned roles can later inherit these rows
 * or add their own via the full Milestone Register. Add-only here (no editing an
 * already-saved row's details) — richer management stays in the Register.
 */
export default function MilestoneQuickCaptureSection({ rows = [], onAdd, onRemove, disabled = false, adding = false }) {
  const [draft, setDraft] = useState({ milestone_name: '', target_date: '' })

  const patchDraft = (field, value) => setDraft((d) => ({ ...d, [field]: value }))

  const submitDraft = async () => {
    const name = draft.milestone_name.trim()
    if (!name || !draft.target_date) return
    await onAdd({ milestone_name: name, target_date: draft.target_date })
    setDraft({ milestone_name: '', target_date: '' })
  }

  const fmtDate = (d) => {
    if (!d) return ''
    try {
      return new Date(d).toLocaleDateString()
    } catch {
      return d
    }
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.id ?? `pending-${index}`}
              className="flex items-start gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            >
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{row.milestone_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(row.target_date)}</p>
              </div>
              {!disabled && row.removable && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                  aria-label={`Remove milestone ${row.milestone_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No milestones captured yet.</p>
      )}

      {!disabled && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={draft.milestone_name}
              onChange={(e) => patchDraft('milestone_name', e.target.value)}
              placeholder="Milestone name *"
              aria-label="New milestone name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="date"
              value={draft.target_date}
              onChange={(e) => patchDraft('target_date', e.target.value)}
              aria-label="New milestone target date"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            type="button"
            onClick={submitDraft}
            disabled={!draft.milestone_name.trim() || !draft.target_date || adding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus className="h-4 w-4" /> Add Milestone
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        For full milestone management (forecast/actual dates, status tracking) use the Milestone Register once the project is saved.
      </p>
    </div>
  )
}
