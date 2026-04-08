/**
 * PM Reporting - Issue Reports (Write)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import IssueReportsList from '../IssueReportsList'

export default function PMReportingIssueReports() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Issue Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage issue reports
          </p>
        </div>
        <IssueReportsList />
      </div>
    </DocumentGovernanceProvider>
  )
}
