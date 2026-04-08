/**
 * PM Governance - Project Mandate (Read/Tailor)
 */

import { useState } from 'react'
import { DocumentGovernanceProvider, useDocumentGovernance } from '../../context/DocumentGovernanceContext'
import MandateList from '../mandate/MandateList'
import TailorDocumentModal from '../../components/ui/TailorDocumentModal'

function PMGovernanceMandateTemplateContent() {
  const { canTailor } = useDocumentGovernance()
  const [showTailorModal, setShowTailorModal] = useState(false)
  const [selectedBaseline, setSelectedBaseline] = useState(null)

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Mandates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View baseline mandates and create tailored copies for your projects
          </p>
        </div>
        <MandateList />
      </div>
      {showTailorModal && selectedBaseline && (
        <TailorDocumentModal
          isOpen={showTailorModal}
          onClose={() => {
            setShowTailorModal(false)
            setSelectedBaseline(null)
          }}
          documentType="mandate"
          baselineDocument={selectedBaseline}
          onSuccess={() => {
            // Refresh list or navigate
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

export default function PMGovernanceMandateTemplate() {
  return (
    <DocumentGovernanceProvider>
      <PMGovernanceMandateTemplateContent />
    </DocumentGovernanceProvider>
  )
}
