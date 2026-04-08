/**
 * PM Initiation - Project Initiation Document (PID) (Write)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import PIDView from '../pid/PIDView'

export default function PMInitiationPID() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Initiation Document (PID)
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage project initiation documents
          </p>
        </div>
        <PIDView />
      </div>
    </DocumentGovernanceProvider>
  )
}
