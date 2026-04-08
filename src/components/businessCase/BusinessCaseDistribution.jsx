/**
 * BusinessCaseDistribution
 * Manages the distribution list for a Business Case document.
 */

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Share2, Loader2 } from 'lucide-react'
import { getDistributionList, addDistributionEntry, removeDistributionEntry } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'

const empty = () => ({
  recipient_name: '',
  recipient_title: '',
  version_distributed: '1.0',
  distribution_status: 'sent',
})

const STATUS_COLORS = {
  sent: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  read: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  acknowledged: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
}

export default function BusinessCaseDistribution({ caseId, readOnly = false }) {
  const toast = useToastContext()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(empty())

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDistributionList(caseId)
      setList(data)
    } catch (err) {
      console.error('Error loading distribution list:', err)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchList() }, [fetchList])

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  const handleAdd = async () => {
    if (!form.recipient_name.trim()) {
      toast.error('Recipient name is required')
      return
    }
    setSaving(true)
    try {
      await addDistributionEntry(caseId, { ...form, date_of_issue: new Date().toISOString().split('T')[0] })
      toast.success('Added to distribution list')
      setAdding(false)
      setForm(empty())
      await fetchList()
    } catch (err) {
      toast.error(err.message || 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Remove from distribution list?')) return
    try {
      await removeDistributionEntry(id)
      toast.success('Removed from distribution list')
      await fetchList()
    } catch (err) {
      toast.error(err.message || 'Failed to remove')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Distribution List
        </h3>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3 h-3" /> Add Recipient
          </button>
        )}
      </div>

      {list.length === 0 && !adding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No distribution records.</p>
      )}

      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recipient</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                {!readOnly && <th className="py-2 px-3" />}
              </tr>
            </thead>
            <tbody>
              {list.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                    {entry.recipient_name}
                    {entry.recipient && (
                      <p className="text-xs text-gray-400">{entry.recipient.email}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{entry.recipient_title || '—'}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{entry.date_of_issue}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{entry.version_distributed}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.distribution_status]}`}>
                      {entry.distribution_status}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="py-2 px-3">
                      <button onClick={() => handleRemove(entry.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-4 mt-3 bg-blue-50 dark:bg-blue-900/10">
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Add Recipient</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Name *</label>
              <input type="text" {...field('recipient_name')} placeholder="Full name"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title / Role</label>
              <input type="text" {...field('recipient_title')} placeholder="Job title"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Version</label>
              <input type="text" {...field('version_distributed')} placeholder="1.0"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select {...field('distribution_status')}
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="sent">Sent</option>
                <option value="read">Read</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setAdding(false); setForm(empty()) }}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
