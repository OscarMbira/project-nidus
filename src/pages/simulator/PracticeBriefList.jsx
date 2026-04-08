/**
 * Practice Brief List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getPracticeBriefs } from '../../services/sim/practiceBriefService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_BRIEF_COLUMNS = [
  { key: 'brief_title', label: 'Title' },
  { key: 'brief_reference', label: 'Reference' }
]

export default function PracticeBriefList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadBriefs()
  }, [projectId])

  const loadBriefs = async () => {
    try {
      setLoading(true)
      const result = await getPracticeBriefs(projectId)
      if (result.success) setBriefs(result.data || [])
    } catch (error) {
      console.error('Error loading briefs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Briefs</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_BRIEF_COLUMNS} data={briefs} baseFilename="PracticeBriefs" disabled={!briefs.length} />
          <button
            onClick={() => navigate(`/simulator/practice-briefs/create?projectId=${projectId}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Brief
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No briefs found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {briefs.map((brief) => (
            <div
              key={brief.id}
              onClick={() => navigate(`/simulator/practice-briefs/${brief.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{brief.brief_title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{brief.brief_description?.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
