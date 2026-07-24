/**
 * Simulator PMO - Practice RFP View
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../../services/simRfpService'
import { useToastContext } from '../../../context/ToastContext'
import RFPDetailView from '../../../components/rfp/RFPDetailView'
import * as simRfpService from '../../../services/simRfpService'

export default function SimulatorPMORFPView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [readOnly, setReadOnly] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPMOAdminRole()
      .then((isPMO) => {
        setReadOnly(!isPMO)
        setLoading(false)
      })
      .catch(() => {
        setReadOnly(true)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RFPDetailView readOnly={readOnly} basePath="/simulator/pmo" rfpService={simRfpService} />
    </div>
  )
}
