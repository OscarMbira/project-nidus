import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, X, Plus } from 'lucide-react'
import { getFollowUps, addFollowUp, updateFollowUp, markFollowUpComplete } from '../../services/checkpointReportFollowUpService'
import { carryForwardFromPrevious } from '../../services/checkpointReportService'

export default function FollowUpsSection({ reportId, followUps, onFollowUpsChange, previousReportId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({
    follow_up_item: '',
    follow_up_type: 'action',
    owner_id: null,
    due_date: null
  })

  useEffect(() => {
    if (reportId && followUps.length === 0) {
      loadFollowUps()
    }
  }, [reportId])

  useEffect(() => {
    if (reportId && previousReportId && followUps.length === 0) {
      handleCarryForward()
    }
  }, [reportId, previousReportId])

  const loadFollowUps = async () => {
    try {
      const data = await getFollowUps(reportId)
      onFollowUpsChange(data)
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    }
  }

  const handleCarryForward = async () => {
    try {
      const count = await carryForwardFromPrevious(reportId, previousReportId)
      if (count > 0) {
        await loadFollowUps()
        alert(`${count} item(s) carried forward from previous report`)
      }
    } catch (error) {
      console.error('Error carrying forward:', error)
    }
  }

  const handleAdd = async () => {
    if (!newFollowUp.follow_up_item.trim()) return

    try {
      const added = await addFollowUp(reportId, newFollowUp)
      onFollowUpsChange([...followUps, added])
      setNewFollowUp({
        follow_up_item: '',
        follow_up_type: 'action',
        owner_id: null,
        due_date: null
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding follow-up:', error)
      alert('Error adding follow-up: ' + error.message)
    }
  }

  const handleComplete = async (followUpId) => {
    try {
      const resolution = prompt('Enter resolution:')
      if (resolution) {
        await markFollowUpComplete(followUpId, resolution)
        await loadFollowUps()
      }
    } catch (error) {
      console.error('Error completing follow-up:', error)
      alert('Error completing follow-up: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Follow-Up Items</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Items from previous checkpoint reports that need to be addressed in this report.
        </p>
      </div>

      {followUps.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No follow-up items</p>
          {previousReportId && (
            <button
              onClick={handleCarryForward}
              disabled={mode === 'view'}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              Carry Forward from Previous Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((item) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 ${
                item.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : item.status === 'carried_forward'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      item.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : item.status === 'carried_forward'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.follow_up_type}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white">{item.follow_up_item}</p>
                  {item.resolution && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Resolution:</strong> {item.resolution}
                    </p>
                  )}
                  {item.due_date && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {mode !== 'view' && item.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(item.id)}
                    className="ml-4 p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Follow-Up Item *
                  </label>
                  <textarea
                    value={newFollowUp.follow_up_item}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, follow_up_item: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Describe the follow-up item..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newFollowUp.follow_up_type}
                      onChange={(e) => setNewFollowUp({ ...newFollowUp, follow_up_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="action">Action</option>
                      <option value="issue">Issue</option>
                      <option value="risk">Risk</option>
                      <option value="decision">Decision</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newFollowUp.due_date || ''}
                      onChange={(e) => setNewFollowUp({ ...newFollowUp, due_date: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Follow-Up Item
            </button>
          )}
        </>
      )}
    </div>
  )
}
