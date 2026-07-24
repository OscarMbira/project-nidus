/**
 * Simulator PMO Governance - Practice Quality Management Strategy
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeQMSList from '../PracticeQMSList'

export default function SimulatorPMOGovernanceQMS() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Quality Management Strategy
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage practice baseline quality management strategies
          </p>
        </div>
        <PracticeQMSList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
