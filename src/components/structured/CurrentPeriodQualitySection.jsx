import { useState } from 'react'
import { CheckCircle, Plus, X, Edit2 } from 'lucide-react'
import { addQualityActivity, updateQualityActivity, deleteQualityActivity } from '../../services/checkpointReportQualityService'

export default function CurrentPeriodQualitySection({ reportId, qualityActivities, onQualityActivitiesChange, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    activity_description: '',
    activity_type: 'review',
    period_type: 'current',
    status: 'planned',
    planned_date: null
  })

  const handleAdd = async () => {
    if (!newActivity.activity_name.trim()) return

    try {
      const added = await addQualityActivity(reportId, newActivity)
      onQualityActivitiesChange([...qualityActivities, added])
      setNewActivity({
        activity_name: '',
        activity_description: '',
        activity_type: 'review',
        period_type: 'current',
        status: 'planned',
        planned_date: null
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding quality activity:', error)
      alert('Error adding quality activity: ' + error.message)
    }
  }

  const handleUpdate = async (activityId, updates) => {
    try {
      const updated = await updateQualityActivity(activityId, updates)
      onQualityActivitiesChange(qualityActivities.map(a => a.id === activityId ? updated : a))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating quality activity:', error)
      alert('Error updating quality activity: ' + error.message)
    }
  }

  const handleDelete = async (activityId) => {
    if (!confirm('Delete this quality activity?')) return

    try {
      await deleteQualityActivity(activityId)
      onQualityActivitiesChange(qualityActivities.filter(a => a.id !== activityId))
    } catch (error) {
      console.error('Error deleting quality activity:', error)
      alert('Error deleting quality activity: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quality Activities</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Quality management activities performed or planned during this reporting period.
        </p>
      </div>

      {qualityActivities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No quality activities added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qualityActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{activity.activity_name}</h4>
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {activity.activity_type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      activity.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : activity.status === 'in_progress'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {activity.status.replace('_', ' ')}
                    </span>
                  </div>
                  {activity.activity_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.activity_description}</p>
                  )}
                  {activity.planned_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Planned: {new Date(activity.planned_date).toLocaleDateString()}
                    </p>
                  )}
                  {activity.outcome && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Outcome:</strong> {activity.outcome}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingId(activity.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
                    Activity Name *
                  </label>
                  <input
                    type="text"
                    value={newActivity.activity_name}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Quality activity name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newActivity.activity_description}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newActivity.activity_type}
                      onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="review">Review</option>
                      <option value="inspection">Inspection</option>
                      <option value="test">Test</option>
                      <option value="audit">Audit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={newActivity.status}
                      onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
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
              Add Quality Activity
            </button>
          )}
        </>
      )}
    </div>
  )
}
