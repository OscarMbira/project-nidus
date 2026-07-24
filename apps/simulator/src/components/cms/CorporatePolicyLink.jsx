/**
 * Corporate Policy Link Component
 * Link to corporate communication policy
 */

import { ExternalLink, FileText } from 'lucide-react'

export default function CorporatePolicyLink({ policyReference, linkUrl, showIcon = true }) {
  if (!policyReference && !linkUrl) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No corporate policy reference provided
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {showIcon && <FileText className="w-4 h-4 text-gray-400" />}
      <div>
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
          >
            {policyReference || 'Corporate Policy'}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {policyReference}
          </span>
        )}
      </div>
    </div>
  )
}
