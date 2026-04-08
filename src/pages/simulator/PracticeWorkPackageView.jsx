/**
 * Practice Work Package View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { getPracticeWorkPackageById } from '../../services/sim/practiceWorkPackageService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_WP_VIEW_SECTIONS = [
  { title: 'Work Package', fields: [
    { key: 'work_package_name', label: 'Name' },
    { key: 'work_package_code', label: 'Code' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PracticeWorkPackageView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [wp, setWp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadWorkPackage()
  }, [id])

  const loadWorkPackage = async () => {
    try {
      setLoading(true)
      const result = await getPracticeWorkPackageById(id)
      if (result.success) setWp(result.data)
    } catch (error) {
      console.error('Error loading work package:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!wp) return <div className="text-center py-12">Work package not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-work-packages?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{wp.work_package_name}</h1>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportWord={() => exportRecordToWord(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportExcel={() => exportRecordToExcel(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportCSV={() => exportRecordToCSV(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportXML={() => exportRecordToXML(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportJSON={() => exportRecordToJSON(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
            onExportPrint={() => exportRecordToPrint(PRACTICE_WP_VIEW_SECTIONS, wp, `PracticeWorkPackage_${wp.work_package_code || id}`)}
          />
          <button onClick={() => navigate(`/simulator/practice-work-packages/${id}/edit?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400">{wp.work_package_description || 'No description'}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Objectives</h3>
          <p className="text-gray-600 dark:text-gray-400">{wp.objectives || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Status</h3>
          <p className="text-gray-600 dark:text-gray-400">{wp.status}</p>
        </div>
      </div>
    </div>
  )
}
