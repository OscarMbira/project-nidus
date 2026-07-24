/**
 * Practice Brief View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { getPracticeBriefById } from '../../services/sim/practiceBriefService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_BRIEF_VIEW_SECTIONS = [
  { title: 'Brief', fields: [
    { key: 'brief_title', label: 'Title' },
    { key: 'brief_reference', label: 'Reference' },
    { key: 'brief_description', label: 'Description' }
  ]}
]

export default function PracticeBriefView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadBrief()
  }, [id])

  const loadBrief = async () => {
    try {
      setLoading(true)
      const result = await getPracticeBriefById(id)
      if (result.success) setBrief(result.data)
    } catch (error) {
      console.error('Error loading brief:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!brief) return <div className="text-center py-12">Brief not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-briefs?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{brief.brief_title}</h1>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportWord={() => exportRecordToWord(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportExcel={() => exportRecordToExcel(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportCSV={() => exportRecordToCSV(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportXML={() => exportRecordToXML(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportJSON={() => exportRecordToJSON(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
            onExportPrint={() => exportRecordToPrint(PRACTICE_BRIEF_VIEW_SECTIONS, brief, `PracticeBrief_${brief.brief_reference || id}`)}
          />
          <button onClick={() => navigate(`/simulator/practice-briefs/${id}/edit?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400">{brief.brief_description || 'No description'}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Project Definition</h3>
          <p className="text-gray-600 dark:text-gray-400">{brief.project_definition || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Project Scope</h3>
          <p className="text-gray-600 dark:text-gray-400">{brief.project_scope || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
