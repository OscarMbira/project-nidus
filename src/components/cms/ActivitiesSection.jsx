/**
 * Activities Section Component
 * Scheduled communication activities list management
 */

import { useState, useEffect } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { getActivities, addActivity, updateActivity, deleteActivity } from '../../services/cmsScheduledActivitiesService'
import ActivityCard from './ActivityCard'

export default function ActivitiesSection({ cmsId, readOnly = false, showFormComponent = null }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cmsId) {
      loadActivities()
    }
  }, [cmsId])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const data = await getActivities(cmsId)
      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      alert('Error loading activities: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this activity?')) return
    try {
      await deleteActivity(id)
      await loadActivities()
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Error deleting activity: ' + error.message)
    }
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding activities
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Scheduled Communication Activities
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define scheduled communication activities (meetings, presentations, workshops, etc.)
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => showFormComponent && showFormComponent()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
        )}
      </div>

      {/* Activities List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No scheduled activities defined yet.</p>
          <p className="text-sm mt-1">Add activities to schedule communication events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={showFormComponent ? () => showFormComponent(activity) : undefined}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
