import { useEffect, useState } from 'react'

function formatDiffValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function humanizeFieldName(field) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Shows original vs proposed field values for a record awaiting authorisation.
 */
export default function PendingChangesDiff({ pending, loading = false, error = null }) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading pending changes…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
  }

  const proposed = pending?.proposed_changes || {}
  const current = pending?.current_values || {}
  const fields = Object.keys(proposed)

  if (!fields.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No deferred field changes on file. Approval will restore live status using current row values.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Pending changes
        </h4>
        {pending?.submitted_at && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Submitted {new Date(pending.submitted_at).toLocaleString()}
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950/80 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Current (approved)</th>
              <th className="px-3 py-2 font-medium">Proposed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {fields.map((field) => (
              <tr key={field} className="bg-white dark:bg-gray-900/40">
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-200">
                  {humanizeFieldName(field)}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatDiffValue(current[field])}</td>
                <td className="px-3 py-2 text-amber-700 dark:text-amber-200">{formatDiffValue(proposed[field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { formatDiffValue, humanizeFieldName }
