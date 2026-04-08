/**
 * PMO Reporting - End Project Reports (Read-Only)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import EndProjectReportView from '../structured/EndProjectReportView'

export default function PMOReportingEndProject() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            End Project Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View project end project reports (read-only oversight)
          </p>
        </div>
        <EndProjectReportView />
      </div>
    </DocumentGovernanceProvider>
  )
}
