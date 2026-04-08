/**
 * Brief Header Component
 * Document header with metadata
 */

import BriefStatusBadge from './BriefStatusBadge'

export default function BriefHeader({ brief, project, mandate }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Project Brief: {brief?.brief_reference || 'Draft'}
          </h1>
          {project && (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Project: <span className="font-semibold">{project.project_name}</span>
              {project.project_code && (
                <span className="ml-2 text-sm">({project.project_code})</span>
              )}
            </p>
          )}
        </div>
        <BriefStatusBadge status={brief?.document_status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {brief?.version_number || '1.0'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Created Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {brief?.created_date || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Author</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {brief?.author_name || brief?.author?.full_name || 'N/A'}
          </p>
        </div>
        {brief?.mandate_id && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Originating Mandate</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {mandate?.mandate_reference || 'N/A'}
            </p>
          </div>
        )}
        {brief?.approved_date && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {brief.approved_date}
            </p>
          </div>
        )}
        {brief?.approved_by_user && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved By</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {brief.approved_by_user.full_name}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
