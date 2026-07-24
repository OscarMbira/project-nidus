/**
 * Simulator PM Delivery - Practice Product Status Account
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticePSAList from '../PracticePSAList'

export default function SimulatorPMDeliveryProductStatusAccount() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Product Status Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage practice product status accounts
          </p>
        </div>
        <PracticePSAList />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
