/**
 * Practice Work Package List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { getPracticeWorkPackages } from '../../services/sim/practiceWorkPackageService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_WP_COLUMNS = [
  { key: 'work_package_name', label: 'Name' },
  { key: 'work_package_code', label: 'Code' },
  { key: 'status', label: 'Status' }
]

export default function PracticeWorkPackageList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [workPackages, setWorkPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadWorkPackages()
  }, [projectId])

  const loadWorkPackages = async () => {
    try {
      setLoading(true)
      const result = await getPracticeWorkPackages(projectId)
      if (result.success) setWorkPackages(result.data || [])
    } catch (error) {
      console.error('Error loading work packages:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Work Packages</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_WP_COLUMNS} data={workPackages} baseFilename="PracticeWorkPackages" disabled={!workPackages.length} />
          <button onClick={() => navigate(`/simulator/practice-work-packages/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create Work Package
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : workPackages.length === 0 ? <div className="text-center py-12 text-gray-500">No work packages found</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workPackages.map((wp) => (
            <div key={wp.id} onClick={() => navigate(`/simulator/practice-work-packages/${wp.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{wp.work_package_name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{wp.work_package_description?.substring(0, 100)}...</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">{wp.work_package_code}</span>
                <span className={`px-2 py-1 text-xs rounded ${wp.status === 'completed' ? 'bg-green-100 text-green-800' : wp.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{wp.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
