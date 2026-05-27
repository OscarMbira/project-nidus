/**
 * PM Initiation - Business Case (list-first; CRUD from list actions)
 */

import { FileText } from 'lucide-react'
import BusinessCaseList from '../../components/businessCase/BusinessCaseList'

export default function PMInitiationBusinessCase() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Cases</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Review and refine business cases across your projects
            </p>
          </div>
        </div>
      </div>
      <BusinessCaseList basePath="/pm/initiation/business-case" />
    </div>
  )
}
