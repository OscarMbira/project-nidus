/**
 * PM Initiation - Project Brief (Refine)
 */

import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import BriefList from '../brief/BriefList'

export default function PMInitiationProjectBrief() {
  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Briefs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Refine PMO-initiated project briefs
          </p>
        </div>
        <BriefList />
      </div>
    </DocumentGovernanceProvider>
  )
}
