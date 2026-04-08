/**
 * Risk Standard Card Component
 * Individual risk standard display card
 */

import { Edit2, Trash2, Shield } from 'lucide-react'

export default function StandardCard({ standard, onEdit, onDelete, readOnly = false }) {
  const standardTypeLabels = {
    iso_31000: 'ISO 31000',
    pmbok: 'PMBOK Guide',
    prince2: 'PRINCE2',
    m_o_r: 'M_o_R (Management of Risk)',
    corporate: 'Corporate Standard',
    customer: 'Customer Standard',
    other: 'Other'
  }

  const complianceLevelColors = {
    mandatory: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    recommended: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    optional: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {standard.standard_name}
            </h4>
            {standard.standard_code && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                {standard.standard_code}
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {standardTypeLabels[standard.standard_type] || standard.standard_type}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${complianceLevelColors[standard.compliance_level] || complianceLevelColors.optional}`}>
              {standard.compliance_level?.charAt(0).toUpperCase() + standard.compliance_level?.slice(1) || 'Optional'}
            </span>
          </div>
          {standard.standard_description && (
            <p className="text-gray-700 dark:text-gray-300 mb-3">{standard.standard_description}</p>
          )}

          {standard.applicability && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Applicability</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{standard.applicability}</p>
            </div>
          )}

          {(standard.template_reference || standard.external_link) && (
            <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              {standard.template_reference && (
                <span>
                  <strong>Template:</strong> {standard.template_reference}
                </span>
              )}
              {standard.external_link && (
                <a
                  href={standard.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Reference →
                </a>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(standard)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit standard"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(standard.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete standard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
