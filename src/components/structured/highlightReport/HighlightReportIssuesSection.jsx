import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import * as issueService from '../../../services/highlightReportIssueService'

export default function HighlightReportIssuesSection({ reportId, formData, onChange, mode }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await issueService.getIssues(reportId)
      setIssues(data || [])
    } catch (e) {
      console.warn('Load issues:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await issueService.addIssue(reportId, { issue_title: 'New issue', priority: 'medium' })
      await load()
    } catch (e) {
      console.warn('Add issue:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await issueService.updateIssue(id, updates)
      await load()
    } catch (e) {
      console.warn('Update issue:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await issueService.deleteIssue(id)
      await load()
    } catch (e) {
      console.warn('Delete issue:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Key Issues
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Key issues for this reporting period. Sync from issue register or add manually.
        </p>
      </div>

      {formData?.issues_summary != null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issues summary</label>
          <textarea
            value={formData.issues_summary || ''}
            onChange={(e) => onChange('issues_summary', e.target.value)}
            disabled={disabled}
            rows={3}
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
              {adding ? 'Adding…' : 'Add issue'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : issues.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No key issues added.</p>
          ) : (
            <div className="space-y-3">
              {issues.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 flex flex-wrap gap-3 items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={i.issue_title || ''}
                      onChange={(e) => handleUpdate(i.id, { issue_title: e.target.value })}
                      disabled={disabled}
                      placeholder="Issue title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    {(i.issue_description || !disabled) && (
                      <textarea
                        value={i.issue_description || ''}
                        onChange={(e) => handleUpdate(i.id, { issue_description: e.target.value })}
                        disabled={disabled}
                        rows={2}
                        placeholder="Description"
                        className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    )}
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDelete(i.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to add key issues.</p>}
    </div>
  )
}
