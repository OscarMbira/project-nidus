/**
 * Project Plan Card Component
 */

import { Calendar, DollarSign, Users, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  baseline: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  superseded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export default function ProjectPlanCard({ plan, projectId }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/app/projects/${projectId}/plans/project-plan`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {plan.plan_title || 'Untitled Plan'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {plan.plan_reference} • Version {plan.version_number}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
          {plan.status?.replace('_', ' ')}
        </span>
      </div>

      {plan.plan_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {plan.plan_description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        {plan.planned_start_date && plan.planned_end_date && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {new Date(plan.planned_start_date).toLocaleDateString()} - {new Date(plan.planned_end_date).toLocaleDateString()}
            </span>
          </div>
        )}
        {plan.total_budget && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4 mr-2" />
            <span>{plan.budget_currency || 'USD'} {parseFloat(plan.total_budget).toLocaleString()}</span>
          </div>
        )}
      </div>

      {plan.is_baseline && (
        <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
          <CheckCircle className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Baseline Plan</span>
        </div>
      )}
    </div>
  )
}
