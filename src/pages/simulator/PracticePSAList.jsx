/**
 * Practice Product Status Account List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getPracticePSA } from '../../services/sim/practiceProductDescriptionService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_PSA_COLUMNS = [
  { key: 'product_name', label: 'Product' },
  { key: 'report_date', label: 'Report Date' },
  { key: 'current_status', label: 'Status' }
]

export default function PracticePSAList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [psas, setPsas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadPSAs()
  }, [projectId])

  const loadPSAs = async () => {
    try {
      setLoading(true)
      const result = await getPracticePSA(projectId)
      if (result.success) setPsas(result.data || [])
    } catch (error) {
      console.error('Error loading PSAs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Product Status Accounts</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_PSA_COLUMNS} data={psas} baseFilename="PracticePSAs" disabled={!psas.length} />
          <button onClick={() => navigate(`/simulator/practice-psa/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create PSA
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : psas.length === 0 ? <div className="text-center py-12 text-gray-500">No PSAs found</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Report Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {psas.map((psa) => (
                <tr key={psa.id} onClick={() => navigate(`/simulator/practice-psa/${psa.id}?projectId=${projectId}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{psa.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{psa.report_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{psa.current_status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{psa.progress_percentage || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
