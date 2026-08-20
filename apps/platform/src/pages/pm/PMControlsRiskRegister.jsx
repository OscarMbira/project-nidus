/**
 * PM Controls - Risk Register (Write)
 */

import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import RiskRegisterView from '../RiskRegisterView'

export default function PMControlsRiskRegister() {
  return (
    <DocumentGovernanceProvider>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <RiskRegisterView />
      </div>
    </DocumentGovernanceProvider>
  )
}
