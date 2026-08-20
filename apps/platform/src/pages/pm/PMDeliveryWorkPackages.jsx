/**
 * PM Delivery - Work Packages (Write)
 */

import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import WorkPackagesListView from '../workpackage/WorkPackagesListView'

export default function PMDeliveryWorkPackages() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkPackagesListView />
      </div>
    </DocumentGovernanceProvider>
  )
}
