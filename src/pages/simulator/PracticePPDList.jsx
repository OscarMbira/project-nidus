/**
 * Practice Project Product Description List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { getPracticePPD } from '../../services/sim/practiceProductDescriptionService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_PPD_COLUMNS = [
  { key: 'product_title', label: 'Title' },
  { key: 'document_ref', label: 'Reference' },
  { key: 'status', label: 'Status' }
]

export default function PracticePPDList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [ppd, setPpd] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadPPD()
  }, [projectId])

  const loadPPD = async () => {
    try {
      setLoading(true)
      const result = await getPracticePPD(projectId)
      if (result.success) setPpd(result.data)
    } catch (error) {
      console.error('Error loading PPD:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Project Product Description</h1>
        {ppd && <ExportListMenu columns={PRACTICE_PPD_COLUMNS} data={[ppd]} baseFilename="PracticePPD" />}
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : !ppd ? <div className="text-center py-12 text-gray-500">No PPD found. Create one from the project detail page.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{ppd.product_title}</h2>
          <p className="text-gray-600 dark:text-gray-400">{ppd.purpose || 'No purpose defined'}</p>
          <button onClick={() => navigate(`/simulator/practice-ppd/${ppd.id}?projectId=${projectId}`)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Details
          </button>
        </div>
      )}
    </div>
  )
}
