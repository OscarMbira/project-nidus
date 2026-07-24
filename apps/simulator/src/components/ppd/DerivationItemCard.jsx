/**
 * Derivation Item Card Component
 * Displays a single derivation item
 */

import { Edit2, Trash2, ExternalLink, FileText, BookOpen } from 'lucide-react'

const DERIVATION_TYPE_COLORS = {
  existing_product: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  design_specification: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  feasibility_report: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  project_mandate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  requirements_document: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  standard: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  regulation: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function DerivationItemCard({ derivation, mode = 'view', onEdit, onDelete, projectId }) {
  const typeColor = DERIVATION_TYPE_COLORS[derivation.derivation_type] || DERIVATION_TYPE_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {derivation.derivation_title}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {derivation.derivation_type?.replace('_', ' ')}
            </span>
          </div>

          {derivation.derivation_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {derivation.derivation_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {derivation.derivation_reference && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Ref: {derivation.derivation_reference}
              </span>
            )}
            {derivation.mandate && (
              <a
                href={`/projects/${projectId}/mandates/${derivation.mandate.id}`}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {derivation.mandate.mandate_title || derivation.mandate.mandate_reference}
              </a>
            )}
          </div>
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit derivation"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
