import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'

/**
 * Quick-capture list of stakeholders identified during project setup, before roles are
 * assigned — captured for audit information. Assigned roles can later inherit these rows
 * or add their own via the full Stakeholder Register. Add-only here (no editing an
 * already-saved row's details) — richer management stays in the Register.
 */
export default function StakeholderQuickCaptureSection({ rows = [], onAdd, onRemove, disabled = false, adding = false }) {
  const [draft, setDraft] = useState({ stakeholder_name: '', stakeholder_title: '', stakeholder_organization: '', email: '' })

  const patchDraft = (field, value) => setDraft((d) => ({ ...d, [field]: value }))

  const submitDraft = async () => {
    const name = draft.stakeholder_name.trim()
    if (!name) return
    await onAdd({
      stakeholder_name: name,
      stakeholder_title: draft.stakeholder_title.trim() || null,
      stakeholder_organization: draft.stakeholder_organization.trim() || null,
      email: draft.email.trim() || null,
    })
    setDraft({ stakeholder_name: '', stakeholder_title: '', stakeholder_organization: '', email: '' })
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
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{row.stakeholder_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {[row.stakeholder_title, row.stakeholder_organization, row.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              {!disabled && row.removable && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                  aria-label={`Remove stakeholder ${row.stakeholder_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No stakeholders captured yet.</p>
      )}

      {!disabled && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={draft.stakeholder_name}
              onChange={(e) => patchDraft('stakeholder_name', e.target.value)}
              placeholder="Name *"
              aria-label="New stakeholder name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="text"
              value={draft.stakeholder_title}
              onChange={(e) => patchDraft('stakeholder_title', e.target.value)}
              placeholder="Title / role"
              aria-label="New stakeholder title"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="text"
              value={draft.stakeholder_organization}
              onChange={(e) => patchDraft('stakeholder_organization', e.target.value)}
              placeholder="Organization"
              aria-label="New stakeholder organization"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="email"
              value={draft.email}
              onChange={(e) => patchDraft('email', e.target.value)}
              placeholder="Email"
              aria-label="New stakeholder email"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            type="button"
            onClick={submitDraft}
            disabled={!draft.stakeholder_name.trim() || adding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus className="h-4 w-4" /> Add Stakeholder
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        For full stakeholder management (analysis, engagement tracking) use the Stakeholder Register once the project is saved.
      </p>
    </div>
  )
}
