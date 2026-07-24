/**
 * Simulator PMO - Practice RFP Edit (PMO Admin only)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../../services/simRfpService'
import { useToastContext } from '../../../context/ToastContext'
import RFPForm from '../../../components/rfp/RFPForm'
import * as simRfpService from '../../../services/simRfpService'

export default function SimulatorPMORFPEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    checkPMOAdminRole()
      .then((ok) => {
        if (!ok) {
          toast?.error?.('You do not have permission to edit RFP documents.')
          navigate(`/simulator/pmo/rfp/${id}/view`, { replace: true })
        }
        setAllowed(ok)
      })
      .catch(() => {
        navigate(`/simulator/pmo/rfp/${id}/view`, { replace: true })
        setAllowed(false)
      })
  }, [navigate, toast, id])

  if (allowed === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!allowed) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RFPForm mode="edit" basePath="/simulator/pmo" rfpService={simRfpService} />
    </div>
  )
}
