import { createContext, useContext, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Document Governance Context
 *
 * Determines the current user's dashboard context (PMO or PM)
 * and provides permission helpers for document governance enforcement.
 *
 * Document Categories:
 * 1. PMO Baselines - PMO writes, PM reads/tailors
 * 2. PMO-Initiated - PMO creates v0, PM refines, PMO approves
 * 3. PM Delivery - PM writes, PMO reads
 */

const DocumentGovernanceContext = createContext(null)

// Document type to governance category mapping
const GOVERNANCE_MAP = {
  // Category 1: PMO-Authored Organisational Standards (Tailorable)
  'mandate': { category: 'pmo_baseline', pmoPermission: 'write', pmPermission: 'tailor' },
  'communication-strategy': { category: 'pmo_baseline', pmoPermission: 'write', pmPermission: 'tailor' },
  'configuration-strategy': { category: 'pmo_baseline', pmoPermission: 'write', pmPermission: 'tailor' },
  'quality-strategy': { category: 'pmo_baseline', pmoPermission: 'write', pmPermission: 'tailor' },
  'risk-strategy': { category: 'pmo_baseline', pmoPermission: 'write', pmPermission: 'tailor' },

  // Category 2: PMO-Initiated → PM-Refined → PMO-Controlled
  'business-case': { category: 'pmo_initiated', pmoPermission: 'approve', pmPermission: 'write' },
  'project-brief': { category: 'pmo_initiated', pmoPermission: 'approve', pmPermission: 'write' },
  'benefits-review-plan': { category: 'pmo_initiated', pmoPermission: 'approve', pmPermission: 'write' },

  // Category 3: PM-Authored Project Delivery Documents
  'pid': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'work-packages': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'product-description': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'project-product-description': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'product-status-account': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'daily-log': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'configuration-items': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'risk-register': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'issue-register': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'quality-register': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'lessons-log': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'checkpoint-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'highlight-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'issue-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'exception-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'end-stage-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'end-project-reports': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'lessons-report': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
  'end-project-report': { category: 'pm_delivery', pmoPermission: 'read', pmPermission: 'write' },
}

export function DocumentGovernanceProvider({ children }) {
  const location = useLocation()

  const value = useMemo(() => {
    // Determine dashboard context from URL
    const dashboardContext = location.pathname.startsWith('/pmo') ? 'PMO' : 'PM'

    /**
     * Get the permission level for a document type in the current dashboard context
     */
    const getPermissionLevel = (documentType) => {
      const governance = GOVERNANCE_MAP[documentType]
      if (!governance) return 'read'

      if (dashboardContext === 'PMO') {
        return governance.pmoPermission
      }
      return governance.pmPermission
    }

    /**
     * Check if the current user can edit a document type
     */
    const canEdit = (documentType) => {
      const permission = getPermissionLevel(documentType)
      return permission === 'write'
    }

    /**
     * Check if the current user can approve a document type
     */
    const canApprove = (documentType) => {
      const permission = getPermissionLevel(documentType)
      return permission === 'approve'
    }

    /**
     * Check if the current user can tailor (clone) a document type
     */
    const canTailor = (documentType) => {
      const permission = getPermissionLevel(documentType)
      return permission === 'tailor'
    }

    /**
     * Get the UI state for a document based on its governance fields
     */
    const getDocumentState = (document) => {
      if (!document) return 'read-only'

      if (document.is_baseline) return 'baseline'
      if (document.is_tailored) return 'tailored'
      if (document.lifecycle_stage === 'under_review') return 'under-review'

      const permission = getPermissionLevel(document.document_type)
      if (permission === 'write' || permission === 'approve') return 'editable'

      return 'read-only'
    }

    /**
     * Get the governance category for a document type
     */
    const getCategory = (documentType) => {
      const governance = GOVERNANCE_MAP[documentType]
      return governance ? governance.category : null
    }

    return {
      dashboardContext,
      getPermissionLevel,
      canEdit,
      canApprove,
      canTailor,
      getDocumentState,
      getCategory,
      GOVERNANCE_MAP
    }
  }, [location.pathname])

  return (
    <DocumentGovernanceContext.Provider value={value}>
      {children}
    </DocumentGovernanceContext.Provider>
  )
}

export function useDocumentGovernance() {
  const context = useContext(DocumentGovernanceContext)
  if (!context) {
    throw new Error('useDocumentGovernance must be used within a DocumentGovernanceProvider')
  }
  return context
}

export default DocumentGovernanceContext
