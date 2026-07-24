/**
 * Simulator PMO Reporting - Practice Exception Reports (Read-Only)
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeExceptionReportList from '../PracticeExceptionReportList'

export default function SimulatorPMOReportingException() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Exception Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View practice project exception reports (read-only)
          </p>
        </div>
        <PracticeExceptionReportList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
