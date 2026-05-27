/**
 * BusinessCaseListPage
 * Main list page for Business Cases accessed from the PMO sidebar.
 * Route: /pmo/initiation/business-case
 */

import { FileText } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import BusinessCaseList from '../../components/businessCase/BusinessCaseList'
import { resolveInitiationBasePath } from '../../utils/initiationRouteUtils'

export default function BusinessCaseListPage() {
  const location = useLocation()
  const basePath = resolveInitiationBasePath(location.pathname)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Cases</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Manage and review project business case documents
            </p>
          </div>
        </div>
      </div>

      <BusinessCaseList basePath={basePath} />
    </div>
  )
}
