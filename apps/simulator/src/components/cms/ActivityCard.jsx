/**
 * Activity Card Component
 * Individual scheduled communication activity display card
 */

import { Edit2, Trash2, Calendar, Clock, Users } from 'lucide-react'

export default function ActivityCard({ activity, onEdit, onDelete, readOnly = false }) {
  const activityTypeLabels = {
    meeting: 'Meeting',
    presentation: 'Presentation',
    workshop: 'Workshop',
    briefing: 'Briefing',
    review: 'Review',
    consultation: 'Consultation',
    other: 'Other'
  }

  const timingLabels = {
    scheduled: 'Scheduled',
    milestone_triggered: 'Milestone Triggered',
    risk_triggered: 'Risk Triggered',
    on_demand: 'On Demand'
  }

  const formatDate = (date) => {
    if (!date) return 'Not set'
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatTime = (time) => {
    if (!time) return ''
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activity.activity_name}
            </h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {activityTypeLabels[activity.activity_type] || activity.activity_type}
            </span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
              {timingLabels[activity.activity_timing] || activity.activity_timing}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{activity.activity_description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {activity.scheduled_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span><strong>Date:</strong> {formatDate(activity.scheduled_date)}</span>
              </div>
            )}

            {activity.scheduled_time && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span><strong>Time:</strong> {formatTime(activity.scheduled_time)}</span>
              </div>
            )}
          </div>

          {activity.participants && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span><strong>Participants:</strong> {activity.participants}</span>
            </div>
          )}

          {activity.location && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>Location:</strong> {activity.location}
            </div>
          )}

          {activity.trigger_condition && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Trigger Condition</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{activity.trigger_condition}</p>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(activity)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit activity"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(activity.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete activity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
