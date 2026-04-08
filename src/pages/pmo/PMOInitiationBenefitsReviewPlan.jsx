/**
 * PMO Initiation - Benefits Review Plan
 * Shows all Benefits Review Plans across all projects for PMO overview.
 * Fixed: replaced auto-create single plan with proper list view.
 */

import BenefitsReviewPlanList from '../benefitsReviewPlan/BenefitsReviewPlanList'
import { FileText } from 'lucide-react'

export default function PMOInitiationBenefitsReviewPlan() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Benefits Review Plans</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Overview of all Benefits Review Plans across projects
            </p>
          </div>
        </div>
      </div>

      <BenefitsReviewPlanList />
    </div>
  )
}
