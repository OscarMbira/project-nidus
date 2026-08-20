/**
 * Simulator PM Controls - Practice Quality Register
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeQualityRegister from '../PracticeQualityRegister'

export default function SimulatorPMControlsQualityRegister() {
  return (
    <PracticeDocumentGovernanceProvider>
      <PracticeQualityRegister />
    </PracticeDocumentGovernanceProvider>
  )
}
