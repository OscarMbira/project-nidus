/**
 * Record Card Component
 * Individual communication record display card
 */

import { Edit2, Trash2, FileText, AlertCircle } from 'lucide-react'

export default function RecordCard({ record, onEdit, onDelete, readOnly = false }) {
  const recordTypeLabels = {
    communication_register: 'Communication Register',
    meeting_minutes: 'Meeting Minutes',
    presentation_slides: 'Presentation Slides',
    reports: 'Reports',
    emails: 'Emails',
    feedback: 'Feedback',
    other: 'Other'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {record.record_name}
            </h4>
            {record.is_mandatory && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Mandatory
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {recordTypeLabels[record.record_type] || record.record_type}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{record.record_description}</p>

          {record.record_purpose && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Purpose</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{record.record_purpose}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {record.storage_location && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Storage Location</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.storage_location}</p>
              </div>
            )}

            {record.retention_period && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Retention Period</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.retention_period}</p>
              </div>
            )}
          </div>

          {record.access_control && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Access Control:</strong> {record.access_control}
            </div>
          )}

          {record.format_requirements && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>Format Requirements:</strong> {record.format_requirements}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(record)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit record"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
