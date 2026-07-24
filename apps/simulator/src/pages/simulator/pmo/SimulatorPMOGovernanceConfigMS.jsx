/**
 * Simulator PMO Governance - Practice Configuration Management Strategy
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeConfigMSList from '../PracticeConfigMSList'

export default function SimulatorPMOGovernanceConfigMS() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Configuration Management Strategy
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage practice baseline configuration management strategies
          </p>
        </div>
        <PracticeConfigMSList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
