import { useState, useEffect } from 'react'
import { Send, UserPlus, Trash2 } from 'lucide-react'
import * as distService from '../../../services/highlightReportDistributionService'

const ROLE_OPTIONS = [
  { value: 'executive', label: 'Executive' },
  { value: 'senior-user', label: 'Senior User' },
  { value: 'senior-supplier', label: 'Senior Supplier' },
  { value: 'project-manager', label: 'Project Manager' },
  { value: 'other', label: 'Other' }
]

export default function HighlightReportDistributionSection({ reportId, mode }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await distService.getDistributionList(reportId)
      setList(data || [])
    } catch (e) {
      console.warn('Load distribution:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id) => {
    if (mode === 'view') return
    try {
      await distService.removeDistributionRecipient(id)
      await load()
    } catch (e) {
      console.warn('Remove recipient:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Send className="h-4 w-4" />
          Distribution &amp; Approval
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Distribution list and workflow status. Add recipients when ready to distribute.
        </p>
      </div>

      {reportId && (
        <>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No distribution recipients. Add recipients when submitting for distribution.</p>
          ) : (
            <div className="space-y-3">
              {list.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 flex flex-wrap gap-3 items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{r.recipient_name || r.recipient_email || 'Unnamed'}</p>
                    {r.recipient_email && <p className="text-sm text-gray-500 dark:text-gray-400">{r.recipient_email}</p>}
                    {r.recipient_role && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600">{r.recipient_role}</span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Status: {r.distribution_status || 'sent'} •
                      {r.date_distributed && ` Distributed: ${new Date(r.date_distributed).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(r.id)}
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

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to manage distribution.</p>}
    </div>
  )
}
