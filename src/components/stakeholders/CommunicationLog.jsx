/**
 * Communication Log – list of communications with effectiveness and response fields.
 * Supports inline edit for response_received, response_notes, effectiveness_rating, next_action, next_action_due_date.
 */

import { useState, useEffect } from 'react'
import { Star, Pencil } from 'lucide-react'
import { getStakeholderCommunications, saveStakeholderCommunication } from '../../services/stakeholderService'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

function StarRating({ value, max = 5, size = 'sm' }) {
  const v = value == null ? 0 : Math.min(max, Math.max(0, Number(value)))
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <span className="inline-flex text-amber-500 dark:text-amber-400" title={`${v}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${iconClass} ${i < v ? 'fill-current' : 'opacity-30'}`}
        />
      ))}
    </span>
  )
}

export default function CommunicationLog({ projectId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    response_received: false,
    response_notes: '',
    effectiveness_rating: null,
    next_action: '',
    next_action_due_date: '',
  })

  useEffect(() => {
    if (projectId) loadLogs()
    else setLogs([])
  }, [projectId])

  const loadLogs = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getStakeholderCommunications({ project_id: projectId })
      setLogs(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (log) => {
    setEditingId(log.id)
    setEditForm({
      response_received: !!log.response_received,
      response_notes: log.response_notes || '',
      effectiveness_rating: log.effectiveness_rating ?? '',
      next_action: log.next_action || '',
      next_action_due_date: log.next_action_due_date ? log.next_action_due_date.slice(0, 10) : '',
    })
  }

  const closeEdit = () => {
    setEditingId(null)
  }

  const handleSaveEffectiveness = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await saveStakeholderCommunication({
        response_received: editForm.response_received,
        response_notes: editForm.response_notes || null,
        effectiveness_rating: editForm.effectiveness_rating === '' || editForm.effectiveness_rating == null ? null : Number(editForm.effectiveness_rating),
        next_action: editForm.next_action || null,
        next_action_due_date: editForm.next_action_due_date || null,
      }, editingId)
      closeEdit()
      loadLogs()
    } catch (e) {
      console.error(e)
      alert(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return null
  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
                <TableRowNumberHeader className="!normal-case" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Response</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Effectiveness</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next action</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{log.communication_subject || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.communication_type || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.actual_date ? new Date(log.actual_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.communication_status || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {log.response_received ? <span className="text-green-600 dark:text-green-400">Yes</span> : <span className="text-gray-400">No</span>}
                  {log.response_notes && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[160px] truncate" title={log.response_notes}>{log.response_notes}</div>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.effectiveness_rating != null ? <StarRating value={log.effectiveness_rating} /> : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {log.next_action ? <span className="max-w-[140px] truncate block" title={log.next_action}>{log.next_action}</span> : '—'}
                  {log.next_action_due_date && <div className="text-xs text-gray-500">{new Date(log.next_action_due_date).toLocaleDateString()}</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(log)}
                    className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                    title="Edit response & effectiveness"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="p-8 text-center text-gray-500 dark:text-gray-400">No communication log entries.</div>}
      </div>

      {editingId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeEdit} aria-hidden="true" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Edit response & effectiveness</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.response_received}
                  onChange={(e) => setEditForm(f => ({ ...f, response_received: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Response received</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response notes</label>
                <textarea
                  value={editForm.response_notes}
                  onChange={(e) => setEditForm(f => ({ ...f, response_notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effectiveness (1–5)</label>
                <select
                  value={editForm.effectiveness_rating === '' || editForm.effectiveness_rating == null ? '' : editForm.effectiveness_rating}
                  onChange={(e) => setEditForm(f => ({ ...f, effectiveness_rating: e.target.value === '' ? null : e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next action</label>
                <input
                  type="text"
                  value={editForm.next_action}
                  onChange={(e) => setEditForm(f => ({ ...f, next_action: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="e.g. Follow up next week"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next action due date</label>
                <input
                  type="date"
                  value={editForm.next_action_due_date}
                  onChange={(e) => setEditForm(f => ({ ...f, next_action_due_date: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveEffectiveness}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={closeEdit} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
