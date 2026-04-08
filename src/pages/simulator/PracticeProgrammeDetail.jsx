import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderTree } from 'lucide-react'
import { getPracticeProgrammeById } from '../../services/sim/practicePortfolioService'

export default function PracticeProgrammeDetail() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const [programme, setProgramme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getPracticeProgrammeById(programmeId)
        if (result.success) {
          setProgramme(result.data)
        } else {
          setError(result.error || 'Failed to load programme')
        }
      } catch (err) {
        console.error('Error loading practice programme:', err)
        setError(err.message || 'Failed to load programme')
      } finally {
        setLoading(false)
      }
    }
    if (programmeId) load()
  }, [programmeId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading practice programme...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !programme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            {error || 'Practice programme not found'}
          </p>
          <button
            onClick={() => navigate('/simulator/practice-programme')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Practice Programmes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/simulator/practice-programme')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <FolderTree className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {programme.programme_name || 'Practice Programme'}
              </h1>
              {programme.programme_status && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Status: {programme.programme_status}
                </p>
              )}
            </div>
          </div>
        </div>
        {programme.programme_description && (
          <p className="text-gray-700 dark:text-gray-300 max-w-3xl">
            {programme.programme_description}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Simulation notes
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This practice programme is stored in the Simulator (`sim` schema) and can be used to
          experiment with portfolio and project coordination concepts without affecting live data.
          Additional simulator dashboards (projects, dependencies, benefits, timeline, reports)
          can be added on top of this record as the simulation curriculum expands.
        </p>
      </div>
    </div>
  )
}

