/**
 * Simulator PMO Governance - Practice Project Mandate
 *
 * Wrapper page for Practice PMO dashboard that provides write permissions for practice mandates
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeBriefList from '../PracticeBriefList'

export default function SimulatorPMOGovernanceMandateTemplate() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Project Mandates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage practice baseline mandates
          </p>
        </div>
        <PracticeBriefList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
