/**
 * Practice PID List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getPracticePIDs } from '../../services/sim/practicePIDService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_PID_COLUMNS = [
  { key: 'pid_title', label: 'Title' },
  { key: 'pid_reference', label: 'Reference' }
]

export default function PracticePIDList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [pids, setPids] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadPIDs()
  }, [projectId])

  const loadPIDs = async () => {
    try {
      setLoading(true)
      const result = await getPracticePIDs(projectId)
      if (result.success) setPids(result.data || [])
    } catch (error) {
      console.error('Error loading PIDs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice PIDs</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_PID_COLUMNS} data={pids} baseFilename="PracticePIDs" disabled={!pids.length} />
          <button onClick={() => navigate(`/simulator/practice-pids/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create PID
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : pids.length === 0 ? <div className="text-center py-12 text-gray-500">No PIDs found</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pids.map((pid) => (
            <div key={pid.id} onClick={() => navigate(`/simulator/practice-pids/${pid.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pid.pid_title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{pid.pid_description?.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
