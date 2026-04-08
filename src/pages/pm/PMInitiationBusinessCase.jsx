/**
 * PM Initiation - Business Case (Refine)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'

export default function PMInitiationBusinessCase() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Business Cases
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Refine PMO-initiated business cases
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Business case refinement interface will be integrated here.
          </p>
        </div>
      </div>
    </DocumentGovernanceProvider>
  )
}
