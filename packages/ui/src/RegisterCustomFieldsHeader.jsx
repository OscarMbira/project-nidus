/**
 * Header of a register's "Custom Fields" tab (v1311): what the tab is, how many of the
 * organisation's allowed custom fields are used, "+ Add custom field" and — for PMO admins —
 * a link to manage fields in Local Data Extensions. Fields themselves are rendered by the page.
 */
import { Plus, Settings2 } from 'lucide-react'

export default function RegisterCustomFieldsHeader({
  count = 0,
  limit = 0,
  loading = false,
  error = '',
  onAdd = null,
  onManage = null,
}) {
  const atLimit = limit > 0 && count >= limit

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Extra fields your organisation added to this register. They are shared with everyone in your organisation.
          </p>
          {!loading && limit > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {count} of {limit} custom fields used{atLimit ? ' — limit reached' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onManage && (
            <button
              type="button"
              onClick={onManage}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
            >
              <Settings2 className="h-4 w-4" />
              Manage fields
            </button>
          )}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              disabled={loading || atLimit}
              title={atLimit ? 'Your organisation has reached its custom-field limit for this register' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
            >
              <Plus className="h-4 w-4" />
              Add custom field
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && count === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          No custom fields yet.{onAdd ? ' Use “Add custom field” to capture extra information.' : ''}
        </p>
      )}
    </div>
  )
}
