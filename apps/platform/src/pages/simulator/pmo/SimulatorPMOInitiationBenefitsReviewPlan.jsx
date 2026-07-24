/**
 * Simulator PMO Initiation - Practice Benefits Review Plan
 * Shows list of all practice BRPs (no projectId required).
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeBenefitsReviewPlanList from '../PracticeBenefitsReviewPlanList'

export default function SimulatorPMOInitiationBenefitsReviewPlan() {
  return (
    <PracticeDocumentGovernanceProvider>
      <PracticeBenefitsReviewPlanList />
    </PracticeDocumentGovernanceProvider>
  )
}
