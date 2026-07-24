/**
 * Method Card Component
 * Individual communication method display card
 */

import { Edit2, Trash2, AlertCircle } from 'lucide-react'

export default function MethodCard({ method, onEdit, onDelete, readOnly = false }) {
  const methodTypeLabels = {
    inform: 'Inform',
    consult: 'Consult',
    involve: 'Involve',
    collaborate: 'Collaborate',
    empower: 'Empower'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {method.method_name}
            </h4>
            {method.is_mandatory && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Mandatory
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {methodTypeLabels[method.method_type] || method.method_type}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{method.method_description}</p>

          {method.when_to_use && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">When to Use</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{method.when_to_use}</p>
            </div>
          )}

          {(method.entry_criteria || method.exit_criteria) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {method.entry_criteria && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Entry Criteria</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{method.entry_criteria}</p>
                </div>
              )}
              {method.exit_criteria && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Exit Criteria</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{method.exit_criteria}</p>
                </div>
              )}
            </div>
          )}

          {method.required_participants && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Required Participants:</strong> {method.required_participants}
            </div>
          )}

          {method.documentation_required && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>Documentation:</strong> {method.documentation_required}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(method)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit method"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(method.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete method"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
