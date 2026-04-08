import { useState } from 'react'
import { X, FileText, CheckCircle } from 'lucide-react'
import { createChangeRequest } from '../../services/issueTransferService'

export default function CreateChangeRequestDialog({ issue, onClose, onSuccess }) {
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!confirm(`Create Change Request from RFC "${issue.issue_title}"?`)) return

    try {
      setCreating(true)
      const changeRequest = await createChangeRequest(issue.id)
      alert(`Change Request created successfully! ID: ${changeRequest.id}`)
      onSuccess()
    } catch (error) {
      console.error('Error creating change request:', error)
      alert('Error creating change request: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Create Change Request
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-800 dark:text-purple-300">
              This will create a formal Change Request from this RFC and link it to the issue.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              RFC: <span className="font-normal">{issue.issue_title}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {issue.issue_description?.substring(0, 150)}...
            </p>
          </div>

          {issue.cost_impact && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Cost Impact:</span> ${parseFloat(issue.cost_impact).toLocaleString()}
              </p>
              {issue.schedule_impact_days && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Schedule Impact:</span> {issue.schedule_impact_days} days
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Change Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
