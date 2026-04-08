/**
 * Simulator PMO - Practice RFP Register
 */

import { useState, useEffect } from 'react'
import RFPList from '../../../components/rfp/RFPList'
import * as simRfpService from '../../../services/simRfpService'

export default function SimulatorPMOProcurementRFP() {
  const [readOnly, setReadOnly] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPMOAdminRole().then((isPMO) => {
      setReadOnly(!isPMO)
      setLoading(false)
    }).catch(() => {
      setReadOnly(true)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RFPList readOnly={readOnly} basePath="/simulator/pmo" rfpService={simRfpService} />
    </div>
  )
}
