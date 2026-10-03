/**
 * PM Initiation — Project Brief or Project Charter (same document; labels from URL).
 */

import { useLocation } from 'react-router-dom'
import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import {
  resolveBriefCharterMode,
  briefCharterLabels,
} from '@nidus/shared/utils/briefCharterTerminology.js'
import BriefList from '../brief/BriefList'

export default function PMInitiationProjectBrief() {
  const location = useLocation()
  const mode = resolveBriefCharterMode(location.pathname)
  const labels = briefCharterLabels(mode)

  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {mode === 'charter'
              ? 'Authorise the project — same content as a Project Brief under the Charter name.'
              : 'Define the project before delivery — also known as Project Charter in some methodologies.'}
          </p>
        </div>
        <BriefList embedded documentMode={mode} />
      </div>
    </DocumentGovernanceProvider>
  )
}
