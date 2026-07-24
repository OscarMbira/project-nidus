/**
 * Derivation Card Component
 */

import { BookOpen, Edit, Trash2, Link as LinkIcon } from 'lucide-react'

export default function DerivationCard({ derivation, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {derivation.derivation_title}
            </h4>
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {derivation.derivation_type?.replace('_', ' ')}
            </span>
          </div>
          {derivation.derivation_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {derivation.derivation_description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {derivation.derivation_reference && (
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                {derivation.derivation_reference}
              </span>
            )}
            {derivation.linked_ppd && (
              <span className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-1" />
                PPD: {derivation.linked_ppd.ppd_reference}
              </span>
            )}
            {derivation.mandate && (
              <span className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-1" />
                Mandate: {derivation.mandate.mandate_reference}
              </span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit derivation"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete derivation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
