/**
 * PM Controls - Issue Register (Write)
 */

import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import IssueRegisterView from '../IssueRegisterView'

export default function PMControlsIssueRegister() {
  return (
    <DocumentGovernanceProvider>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <IssueRegisterView />
      </div>
    </DocumentGovernanceProvider>
  )
}
