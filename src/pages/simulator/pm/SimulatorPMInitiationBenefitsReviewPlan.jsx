/**
 * Simulator PM Initiation - Practice Benefits Review Plan
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeBenefitsReviewPlan from '../PracticeBenefitsReviewPlan'

export default function SimulatorPMInitiationBenefitsReviewPlan() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Benefits Review Plans
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Refine and manage practice benefits review plans
          </p>
        </div>
        <PracticeBenefitsReviewPlan />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
