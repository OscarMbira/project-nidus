/**
 * PM Initiation - Business Case (list-first; CRUD from list actions)
 * Scoped to the currently selected project in the PM toolbar.
 */

import { FileText } from 'lucide-react'
import BusinessCaseList from '../../components/businessCase/BusinessCaseList'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'

export default function PMInitiationBusinessCase() {
  const { projectId, loading: projectLoading } = usePlatformProjectId()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Cases</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Business cases for the current project only
            </p>
          </div>
        </div>
      </div>
      {projectLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-10 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Select a project in the toolbar to view its business cases.
          </p>
        </div>
      ) : (
        <BusinessCaseList
          basePath="/pm/initiation/business-case"
          projectId={projectId}
        />
      )}
    </div>
  )
}
