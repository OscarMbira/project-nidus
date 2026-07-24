/**
 * Simulator PMO - Practice RFP Create (PMO Admin only)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../../services/simRfpService'
import { useToastContext } from '../../../context/ToastContext'
import RFPForm from '../../../components/rfp/RFPForm'
import * as simRfpService from '../../../services/simRfpService'

export default function SimulatorPMORFPCreate() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    checkPMOAdminRole()
      .then((ok) => {
        if (!ok) {
          toast?.error?.('You do not have permission to create RFP documents.')
          navigate('/simulator/pmo/procurement/rfp', { replace: true })
        }
        setAllowed(ok)
      })
      .catch(() => {
        navigate('/simulator/pmo/procurement/rfp', { replace: true })
        setAllowed(false)
      })
  }, [navigate, toast])

  if (allowed === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!allowed) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RFPForm mode="create" basePath="/simulator/pmo" rfpService={simRfpService} />
    </div>
  )
}
