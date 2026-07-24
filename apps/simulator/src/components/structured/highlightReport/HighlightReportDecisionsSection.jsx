import { useState, useEffect } from 'react'
import { Gavel, Plus, Trash2 } from 'lucide-react'
import * as decisionService from '../../../services/highlightReportDecisionService'

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'decided', label: 'Decided' },
  { value: 'deferred', label: 'Deferred' }
]

export default function HighlightReportDecisionsSection({ reportId, formData, onChange, mode }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await decisionService.getDecisions(reportId)
      setDecisions(data || [])
    } catch (e) {
      console.warn('Load decisions:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await decisionService.addDecision(reportId, { decision_title: 'New decision', priority: 'medium', status: 'pending' })
      await load()
    } catch (e) {
      console.warn('Add decision:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await decisionService.updateDecision(id, updates)
      await load()
    } catch (e) {
      console.warn('Update decision:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await decisionService.deleteDecision(id)
      await load()
    } catch (e) {
      console.warn('Delete decision:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Gavel className="h-4 w-4" />
          Decisions Required
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Decisions needed from the Project Board.
        </p>
      </div>

      {formData?.decisions_required != null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions required (summary)</label>
          <textarea
            value={formData.decisions_required || ''}
            onChange={(e) => onChange('decisions_required', e.target.value)}
            disabled={disabled}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {formData?.recommendations != null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendations</label>
          <textarea
            value={formData.recommendations || ''}
            onChange={(e) => onChange('recommendations', e.target.value)}
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
              {adding ? 'Adding…' : 'Add decision'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No decisions added.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={d.decision_title || ''}
                      onChange={(e) => handleUpdate(d.id, { decision_title: e.target.value })}
                      disabled={disabled}
                      placeholder="Decision title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={d.priority || 'medium'}
                      onChange={(e) => handleUpdate(d.id, { priority: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={d.status || 'pending'}
                      onChange={(e) => handleUpdate(d.id, { status: e.target.value })}
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
                        onClick={() => handleDelete(d.id)}
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

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to add decisions.</p>}
    </div>
  )
}
