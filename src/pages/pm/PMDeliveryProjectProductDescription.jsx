/**
 * PM Delivery - Project Product Description (Write)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import PPDView from '../PPDView'

export default function PMDeliveryProjectProductDescription() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Product Description
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage project product descriptions
          </p>
        </div>
        <PPDView />
      </div>
    </DocumentGovernanceProvider>
  )
}
