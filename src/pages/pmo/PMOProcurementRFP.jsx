/**
 * PMO Procurement RFP - List Page
 * Wrapper that passes readOnly based on role (PMO Admin = full access, others = read-only).
 * Renders list immediately; role check runs in parallel so data can start loading without blocking.
 */

import { useState, useEffect } from 'react'
import RFPList from '../../components/rfp/RFPList'
import { checkPMOAdminRole } from '../../services/rfpService'

export default function PMOProcurementRFP() {
  const [readOnly, setReadOnly] = useState(true)

  useEffect(() => {
    checkPMOAdminRole()
      .then((isPMO) => setReadOnly(!isPMO))
      .catch(() => setReadOnly(true))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RFPList readOnly={readOnly} />
    </div>
  )
}
