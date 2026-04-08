/**
 * MandateHeader Component
 * Displays mandate document metadata (reference, version, dates, status)
 * Works for both Platform and Simulator
 */

import { FileText, Calendar, User, Award } from 'lucide-react'
import MandateStatusBadge from './MandateStatusBadge'

export default function MandateHeader({ mandate, isPractice = false }) {
  if (!mandate) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mandate.mandate_title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {mandate.mandate_reference}
                {mandate.version_number && ` • Version ${mandate.version_number}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {mandate.created_date ? new Date(mandate.created_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {mandate.printed_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Printed</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(mandate.printed_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {mandate.proposed_executive_name && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Proposed Executive</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {mandate.proposed_executive_name}
                  </p>
                </div>
              </div>
            )}

            {mandate.proposed_pm_name && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Proposed PM</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {mandate.proposed_pm_name}
                  </p>
                </div>
              </div>
            )}

            {isPractice && mandate.practice_score !== null && (
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Practice Score</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {mandate.practice_score}/100
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ml-4">
          <MandateStatusBadge status={mandate.document_status} isPractice={isPractice} />
        </div>
      </div>
    </div>
  )
}
