import { useState } from 'react'
import { AlertTriangle, Plus, Edit2, Trash2, Sync } from 'lucide-react'
import { addRiskReview, updateRiskReview, deleteRiskReview, syncRisksFromRegister } from '../../../services/endStageReportRiskService'

export default function EndStageReportRiskReviewSection({ reportId, riskReviews, onRiskReviewsChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    try {
      setSyncing(true)
      const synced = await syncRisksFromRegister(reportId)
      onRiskReviewsChange([...riskReviews, ...synced])
      alert(`Synced ${synced.length} risks from register`)
    } catch (error) {
      console.error('Error syncing risks:', error)
      alert('Error syncing risks: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleAdd = async (riskData) => {
    try {
      const added = await addRiskReview(reportId, riskData)
      onRiskReviewsChange([...riskReviews, added])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding risk review:', error)
      alert('Error adding risk review: ' + error.message)
    }
  }

  const handleUpdate = async (riskReviewId, updates) => {
    try {
      const updated = await updateRiskReview(riskReviewId, updates)
      onRiskReviewsChange(riskReviews.map(r => r.id === riskReviewId ? updated : r))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating risk review:', error)
      alert('Error updating risk review: ' + error.message)
    }
  }

  const handleDelete = async (riskReviewId) => {
    if (!confirm('Delete this risk review?')) return

    try {
      await deleteRiskReview(riskReviewId)
      onRiskReviewsChange(riskReviews.filter(r => r.id !== riskReviewId))
    } catch (error) {
      console.error('Error deleting risk review:', error)
      alert('Error deleting risk review: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
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
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Risk Review</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Review risks from the stage, including status changes and response effectiveness.
            </p>
          </div>
          {mode !== 'view' && (
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Sync className="h-4 w-4" />
                {syncing ? 'Syncing...' : 'Sync from Register'}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Risk
              </button>
            </div>
          )}
        </div>
      </div>

      {riskReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No risk reviews added yet.</p>
          {mode !== 'view' && (
            <button
              onClick={handleSync}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
            >
              Sync Risks from Register
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {riskReviews.map((risk, index) => (
            <div key={risk.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{risk.risk_title}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(risk.risk_status)}`}>
                      {risk.risk_status.replace('-', ' ')}
                    </span>
                  </div>
                  {risk.risk_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{risk.risk_description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span>Probability: {risk.original_probability} → {risk.current_probability}</span>
                    </div>
                    <div>
                      <span>Impact: {risk.original_impact} → {risk.current_impact}</span>
                    </div>
                  </div>
                  {risk.risk_response_actions && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Response Actions:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{risk.risk_response_actions}</p>
                    </div>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(risk.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(risk.id)}
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
