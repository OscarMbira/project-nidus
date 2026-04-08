import { useState } from 'react'
import { AlertCircle, Plus, Edit2, Trash2, Sync } from 'lucide-react'
import { addIssueReview, updateIssueReview, deleteIssueReview, syncIssuesFromRegister } from '../../../services/endStageReportIssueService'

export default function EndStageReportIssueReviewSection({ reportId, issueReviews, onIssueReviewsChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    try {
      setSyncing(true)
      const synced = await syncIssuesFromRegister(reportId)
      onIssueReviewsChange([...issueReviews, ...synced])
      alert(`Synced ${synced.length} issues from register`)
    } catch (error) {
      console.error('Error syncing issues:', error)
      alert('Error syncing issues: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleAdd = async (issueData) => {
    try {
      const added = await addIssueReview(reportId, issueData)
      onIssueReviewsChange([...issueReviews, added])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding issue review:', error)
      alert('Error adding issue review: ' + error.message)
    }
  }

  const handleUpdate = async (issueReviewId, updates) => {
    try {
      const updated = await updateIssueReview(issueReviewId, updates)
      onIssueReviewsChange(issueReviews.map(i => i.id === issueReviewId ? updated : i))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating issue review:', error)
      alert('Error updating issue review: ' + error.message)
    }
  }

  const handleDelete = async (issueReviewId) => {
    if (!confirm('Delete this issue review?')) return

    try {
      await deleteIssueReview(issueReviewId)
      onIssueReviewsChange(issueReviews.filter(i => i.id !== issueReviewId))
    } catch (error) {
      console.error('Error deleting issue review:', error)
      alert('Error deleting issue review: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'transferred-next-stage':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'carried-forward':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Issue Review</h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Review issues from the stage, including resolution actions and lessons learned.
            </p>
          </div>
          {mode !== 'view' && (
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Sync className="h-4 w-4" />
                {syncing ? 'Syncing...' : 'Sync from Register'}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Issue
              </button>
            </div>
          )}
        </div>
      </div>

      {issueReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No issue reviews added yet.</p>
          {mode !== 'view' && (
            <button
              onClick={handleSync}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Sync Issues from Register
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {issueReviews.map((issue) => (
            <div key={issue.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{issue.issue_title}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(issue.issue_status)}`}>
                      {issue.issue_status.replace('-', ' ')}
                    </span>
                  </div>
                  {issue.issue_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{issue.issue_description}</p>
                  )}
                  {issue.resolution_actions && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Resolution Actions:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{issue.resolution_actions}</p>
                    </div>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(issue.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(issue.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
