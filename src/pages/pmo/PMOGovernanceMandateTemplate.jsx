/**
 * PMO Governance - Project Mandate
 *
 * Wrapper page for PMO dashboard that provides write permissions for mandates
 */

import { memo } from 'react'
import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext'
import MandateList from '../mandate/MandateList'

function PMOGovernanceMandateTemplate() {
  return (
    <DocumentGovernanceProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Mandates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage organizational baseline mandates
          </p>
        </div>
        <MandateList />
      </div>
    </DocumentGovernanceProvider>
  )
}

export default memo(PMOGovernanceMandateTemplate)
