/**
 * Simulator PM Initiation - Practice Benefits Review Plan (list-first)
 */

import { PracticeDocumentGovernanceProvider } from '@nidus/shared/context/PracticeDocumentGovernanceContext'
import PracticeBenefitsReviewPlanList from '../PracticeBenefitsReviewPlanList'

export default function SimulatorPMInitiationBenefitsReviewPlan() {
  return (
    <PracticeDocumentGovernanceProvider>
      <PracticeBenefitsReviewPlanList />
    </PracticeDocumentGovernanceProvider>
  )
}
