/**
 * PM Controls - Lessons Log (Write)
 */

import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import LessonsLogView from '../LessonsLogView'

export default function PMControlsLessonsLog() {
  return (
    <DocumentGovernanceProvider>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lessons Log
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage project lessons log
          </p>
        </div>
        <LessonsLogView />
      </div>
    </DocumentGovernanceProvider>
  )
}
