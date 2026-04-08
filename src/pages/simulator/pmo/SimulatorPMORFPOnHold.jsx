/**
 * Simulator PMO - Practice RFP Drafts (On Hold)
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../../services/simRfpService'
import { useToastContext } from '../../../context/ToastContext'

export default function SimulatorPMORFPOnHold() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const [isPMO, setIsPMO] = useState(null)
  const hasHandledRedirect = useRef(false)

  useEffect(() => {
    if (hasHandledRedirect.current) return
    checkPMOAdminRole().then((ok) => {
      if (!ok) {
        if (hasHandledRedirect.current) return
        hasHandledRedirect.current = true
        toast?.error?.('You do not have permission to view RFP drafts.')
        navigate('/simulator/pmo/procurement/rfp', { replace: true })
      }
      setIsPMO(ok)
    }).catch(() => {
      if (!hasHandledRedirect.current) {
        hasHandledRedirect.current = true
        navigate('/simulator/pmo/procurement/rfp', { replace: true })
      }
      setIsPMO(false)
    })
  }, [navigate, toast])

  if (isPMO === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!isPMO) return null

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Practice RFP Drafts (On Hold)</h1>
      <p className="text-gray-600 dark:text-gray-400">Draft queue integration for RFP will be available when the RFP entity is registered in the draft queue config.</p>
    </div>
  )
}
