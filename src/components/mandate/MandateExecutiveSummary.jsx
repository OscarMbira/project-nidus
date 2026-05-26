/**
 * MandateExecutiveSummary Component
 * Generates an executive summary report for mandates
 * Platform only (not typically needed for practice)
 */

import { FileText, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'

export default function MandateExecutiveSummary({ mandate, deliverables = [], stakeholders = [] }) {
  if (!mandate) return null

  const inScopeDeliverables = deliverables.filter(d => d.is_in_scope !== false)
  const primaryStakeholders = stakeholders.filter(s => s.is_primary || s.stakeholder_type === 'customer')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Summary</h2>
      </div>

      <div className="space-y-6">
        {/* Key Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
              <p className="font-medium text-gray-900 dark:text-white">{mandate.mandate_reference}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {mandate.created_date ? format(new Date(mandate.created_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Purpose Summary */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
            {mandate.purpose || 'Not specified'}
          </p>
        </div>

        {/* Objectives Summary */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key Objectives</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
            {mandate.project_objectives || 'Not specified'}
          </p>
        </div>

        {/* Business Case Summary */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Business Justification</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
            {mandate.outline_business_case || 'Not specified'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Deliverables</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inScopeDeliverables.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Stakeholders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stakeholders.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {mandate.document_status}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Priority</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {mandate.quality_priority || 'Balanced'}
            </p>
          </div>
        </div>

        {/* Proposed Roles */}
        {(mandate.proposed_executive_name || mandate.proposed_pm_name) && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Proposed Leadership</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mandate.proposed_executive_name && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Executive</p>
                    <p className="font-medium text-gray-900 dark:text-white">{mandate.proposed_executive_name}</p>
                  </div>
                </div>
              )}
              {mandate.proposed_pm_name && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Project Manager</p>
                    <p className="font-medium text-gray-900 dark:text-white">{mandate.proposed_pm_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Primary Stakeholders */}
        {primaryStakeholders.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Stakeholders</h3>
            <div className="space-y-2">
              {primaryStakeholders.slice(0, 5).map((s, index) => (
                <div key={s.id} className="text-sm">                  <span className="font-medium text-gray-900 dark:text-white">{s.stakeholder_name}</span>
                  {s.stakeholder_organisation && (
                    <span className="text-gray-600 dark:text-gray-400"> - {s.stakeholder_organisation}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
