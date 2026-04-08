/**
 * Plan Document Links Component
 * Shows links to related documents (PID, Business Case, PPD)
 */

import { FileText, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PlanDocumentLinks({ plan, projectId }) {
  const navigate = useNavigate()

  const links = []

  if (plan.pid_id) {
    links.push({
      id: 'pid',
      label: 'Project Initiation Document',
      reference: plan.pid?.pid_reference || 'PID',
      onClick: () => navigate(`/app/projects/${projectId}/pid`)
    })
  }

  if (plan.business_case_id) {
    links.push({
      id: 'bc',
      label: 'Business Case',
      reference: plan.business_case?.bc_reference || 'BC',
      onClick: () => navigate(`/app/projects/${projectId}/business-case`)
    })
  }

  if (plan.project_product_description_id) {
    links.push({
      id: 'ppd',
      label: 'Project Product Description',
      reference: plan.ppd?.ppd_reference || 'PPD',
      onClick: () => navigate(`/app/projects/${projectId}/ppd`)
    })
  }

  if (links.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No document links configured
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {links.map(link => (
        <button
          key={link.id}
          onClick={link.onClick}
          className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center">
            <FileText className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {link.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {link.reference}
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>
      ))}
    </div>
  )
}
