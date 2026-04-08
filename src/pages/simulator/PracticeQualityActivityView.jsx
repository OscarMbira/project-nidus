/**
 * Practice Quality Activity View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeQualityActivityById } from '../../services/sim/practiceQualityService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_QA_VIEW_SECTIONS = [
  { title: 'Quality Activity', fields: [
    { key: 'activity_name', label: 'Name' },
    { key: 'activity_type', label: 'Type' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PracticeQualityActivityView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadActivity()
  }, [id])

  const loadActivity = async () => {
    try {
      setLoading(true)
      const result = await getPracticeQualityActivityById(id)
      if (result.success) setActivity(result.data)
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!activity) return <div className="text-center py-12">Activity not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-quality-register?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{activity.activity_name}</h1>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportWord={() => exportRecordToWord(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportExcel={() => exportRecordToExcel(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportCSV={() => exportRecordToCSV(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportXML={() => exportRecordToXML(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportJSON={() => exportRecordToJSON(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
          onExportPrint={() => exportRecordToPrint(PRACTICE_QA_VIEW_SECTIONS, activity, `PracticeQualityActivity_${activity.id}`)}
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Activity Type</h3>
          <p className="text-gray-600 dark:text-gray-400">{activity.activity_type}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Status</h3>
          <p className="text-gray-600 dark:text-gray-400">{activity.status}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Result</h3>
          <p className="text-gray-600 dark:text-gray-400">{activity.result || 'Pending'}</p>
        </div>
      </div>
    </div>
  )
}
