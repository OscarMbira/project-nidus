/**
 * Scheduled Activities Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getActivities } from '../../services/rmsScheduledActivitiesService'

export default function ActivitiesSection({ rmsId, readOnly = false }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadActivities()
    }
  }, [rmsId])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const result = await getActivities(rmsId)
      if (result.success) {
        setActivities(result.data || [])
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scheduled Risk Activities
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Risk management activities and their timing
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No scheduled activities defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{activity.activity_name}</h4>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {activity.activity_type?.replace('_', ' ')}
                </span>
                {activity.timing && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                    {activity.timing?.replace('_', ' ')}
                  </span>
                )}
              </div>
              {activity.activity_description && <p className="text-gray-700 dark:text-gray-300 mb-2">{activity.activity_description}</p>}
              {activity.frequency && (
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Frequency:</strong> {activity.frequency}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
