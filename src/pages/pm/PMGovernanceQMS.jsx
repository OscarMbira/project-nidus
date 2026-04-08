/**
 * PM Governance - Quality Management Strategy (Read/Tailor)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import QMSList from '../QMSList'

export default function PMGovernanceQMS() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quality Management Strategies
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View baseline QMS and create tailored copies for your projects
          </p>
        </div>
        <QMSList />
      </div>
    </DocumentGovernanceProvider>
  )
}
