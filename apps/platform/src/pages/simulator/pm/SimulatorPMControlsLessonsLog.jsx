/**
 * Simulator PM Controls - Practice Lessons Log
 */

import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext'
import PracticeLessonsLog from '../PracticeLessonsLog'

export default function SimulatorPMControlsLessonsLog() {
  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Lessons Log
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage practice lesson entries
          </p>
        </div>
        <PracticeLessonsLog />
      </div>
    </PracticeDocumentGovernanceProvider>
  )
}
