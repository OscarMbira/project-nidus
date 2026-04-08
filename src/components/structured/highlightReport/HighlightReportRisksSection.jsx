import { useState, useEffect } from 'react'
import { ShieldAlert, Plus, Trash2 } from 'lucide-react'
import * as riskService from '../../../services/highlightReportRiskService'

export default function HighlightReportRisksSection({ reportId, formData, onChange, mode }) {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await riskService.getRisks(reportId)
      setRisks(data || [])
    } catch (e) {
      console.warn('Load risks:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await riskService.addRisk(reportId, { risk_title: 'New risk', risk_category: 'key_risk' })
      await load()
    } catch (e) {
      console.warn('Add risk:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await riskService.updateRisk(id, updates)
      await load()
    } catch (e) {
      console.warn('Update risk:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await riskService.deleteRisk(id)
      await load()
    } catch (e) {
      console.warn('Delete risk:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Key Risks
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Key risks for this reporting period. Sync from risk register or add manually.
        </p>
      </div>

      {formData?.risks_summary != null && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risks summary</label>
          <textarea
            value={formData.risks_summary || ''}
            onChange={(e) => onChange('risks_summary', e.target.value)}
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
              {adding ? 'Adding…' : 'Add risk'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : risks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No key risks added.</p>
          ) : (
            <div className="space-y-3">
              {risks.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 flex flex-wrap gap-3 items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={r.risk_title || ''}
                      onChange={(e) => handleUpdate(r.id, { risk_title: e.target.value })}
                      disabled={disabled}
                      placeholder="Risk title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    {(r.risk_description || !disabled) && (
                      <textarea
                        value={r.risk_description || ''}
                        onChange={(e) => handleUpdate(r.id, { risk_description: e.target.value })}
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
                      onClick={() => handleDelete(r.id)}
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

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to add key risks.</p>}
    </div>
  )
}
