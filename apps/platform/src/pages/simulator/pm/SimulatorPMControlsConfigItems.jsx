/**
 * Simulator PM Controls - Practice Configuration Item Records
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeConfigItemList from '../PracticeConfigItemList'

export default function SimulatorPMControlsConfigItems() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Configuration Item Records
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage practice configuration items
          </p>
        </div>
        <PracticeConfigItemList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
