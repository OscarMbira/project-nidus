/**
 * PMORFPBulkImport - Bulk import line items (PMO Admin only)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { checkPMOAdminRole } from '../../services/rfpService'
import { useToastContext } from '../../context/ToastContext'
import RFPBulkImport from '../../components/rfp/RFPBulkImport'

export default function PMORFPBulkImport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [isPMO, setIsPMO] = useState(null)

  useEffect(() => {
    checkPMOAdminRole().then((ok) => {
      if (!ok) {
        toast?.error?.('You do not have permission to import RFP line items.')
        navigate(`/pmo/rfp/${id}/view`, { replace: true })
      }
      setIsPMO(ok)
    }).catch(() => {
      navigate(`/pmo/rfp/${id}/view`, { replace: true })
      setIsPMO(false)
    })
  }, [navigate, toast, id])

  if (isPMO === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!isPMO) return null

  return (
    <div className="max-w-4xl mx-auto py-8">
      <button onClick={() => navigate(`/pmo/rfp/${id}/view`)} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to RFP
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Bulk Import Line Items</h1>
      <RFPBulkImport rfpId={id} onImportComplete={() => navigate(`/pmo/rfp/${id}/edit`)} />
    </div>
  )
}
