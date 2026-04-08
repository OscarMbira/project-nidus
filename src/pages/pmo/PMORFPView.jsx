/**
 * PMORFPView - View RFP detail
 * Passes readOnly based on role (PMO Admin = false, others = true)
 */

import { useState, useEffect } from 'react'
import RFPDetailView from '../../components/rfp/RFPDetailView'
import { checkPMOAdminRole } from '../../services/rfpService'

export default function PMORFPView() {
  const [readOnly, setReadOnly] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPMOAdminRole().then(setReadOnly).catch(() => setReadOnly(true)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>

  return <RFPDetailView readOnly={!readOnly} />
}
