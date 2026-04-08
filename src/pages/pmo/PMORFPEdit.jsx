/**
 * PMORFPEdit - Edit RFP (PMO Admin only)
 * Non-PMO users redirected to view with warning toast
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { checkPMOAdminRole } from '../../services/rfpService'
import { useToastContext } from '../../context/ToastContext'
import RFPForm from '../../components/rfp/RFPForm'

export default function PMORFPEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [isPMO, setIsPMO] = useState(null)

  useEffect(() => {
    checkPMOAdminRole().then((ok) => {
      if (!ok) {
        toast?.error?.('You do not have permission to edit RFP documents.')
        navigate(`/pmo/rfp/${id}/view`, { replace: true })
      }
      setIsPMO(ok)
    }).catch(() => {
      toast?.error?.('You do not have permission to edit RFP documents.')
      navigate(`/pmo/rfp/${id}/view`, { replace: true })
      setIsPMO(false)
    })
  }, [navigate, toast, id])

  if (isPMO === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!isPMO) return null

  return <RFPForm mode="edit" />
}
