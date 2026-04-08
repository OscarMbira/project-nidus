/**
 * PMORFPCreate - Create RFP (PMO Admin only)
 * Non-PMO users redirected to list with warning toast
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../services/rfpService'
import { useToastContext } from '../../context/ToastContext'
import RFPForm from '../../components/rfp/RFPForm'

export default function PMORFPCreate() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const [isPMO, setIsPMO] = useState(null)

  useEffect(() => {
    checkPMOAdminRole().then((ok) => {
      if (!ok) {
        toast?.error?.('You do not have permission to load RFP documents.')
        navigate('/pmo/procurement/rfp', { replace: true })
      }
      setIsPMO(ok)
    }).catch(() => {
      toast?.error?.('You do not have permission to load RFP documents.')
      navigate('/pmo/procurement/rfp', { replace: true })
      setIsPMO(false)
    })
  }, [navigate, toast])

  if (isPMO === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!isPMO) return null

  return <RFPForm mode="create" />
}
