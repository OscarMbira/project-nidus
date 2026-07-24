import { useState, useEffect } from 'react'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import * as changeService from '../../../services/highlightReportChangeService'

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' }
]

export default function HighlightReportChangesSection({ reportId, formData, onChange, mode }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await changeService.getChangeRequests(reportId)
      setChanges(data || [])
    } catch (e) {
      console.warn('Load changes:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await changeService.addChangeRequest(reportId, { change_title: 'New change', change_status: 'pending' })
      await load()
    } catch (e) {
      console.warn('Add change:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await changeService.updateChangeRequest(id, updates)
      await load()
    } catch (e) {
      console.warn('Update change:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await changeService.deleteChangeRequest(id)
      await load()
    } catch (e) {
      console.warn('Delete change:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Change Requests
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Approved and pending changes relevant to this report.
        </p>
      </div>

      {formData?.changes_summary != null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Changes summary</label>
          <textarea
            value={formData.changes_summary || ''}
            onChange={(e) => onChange('changes_summary', e.target.value)}
            disabled={disabled}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {reportId && (
        <>
          {!disabled && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add change'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No change requests linked.</p>
          ) : (
            <div className="space-y-3">
              {changes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={c.change_title || ''}
                      onChange={(e) => handleUpdate(c.id, { change_title: e.target.value })}
                      disabled={disabled}
                      placeholder="Change title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={c.change_status || 'pending'}
                      onChange={(e) => handleUpdate(c.id, { change_status: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3" />
                  <div className="md:col-span-1">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to link change requests.</p>}
    </div>
  )
}
