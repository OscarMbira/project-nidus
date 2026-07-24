import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit, GraduationCap, Search } from 'lucide-react'
import { getAllSimMandates } from '../../services/simulatorMandateService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const SIM_MANDATE_COLUMNS = [
  { key: 'mandate_reference', label: 'Reference' },
  { key: 'mandate_title', label: 'Title' },
  { key: 'document_status', label: 'Status' }
]

export default function SimMandateList() {
  const navigate = useNavigate()
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })

  useEffect(() => {
    fetchMandates()
  }, [filters])

  const fetchMandates = async () => {
    try {
      setLoading(true)
      const data = await getAllSimMandates(filters)
      setMandates(data || [])
    } catch (error) {
      console.error('Error fetching practice mandates:', error)
      alert('Error loading practice mandates: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'submitted': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'rejected': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Project Mandates</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Practice creating project mandates - for learning purposes only
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <ExportListMenu columns={SIM_MANDATE_COLUMNS} data={mandates} baseFilename="PracticeMandates" disabled={!mandates.length} />
            <button
              onClick={() => navigate('/simulator/mandates/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Practice Mandate
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Learning Mode:</strong> These are practice exercises. Use them to learn project mandate creation without affecting real projects.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search practice mandates..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Mandates List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading practice mandates...</p>
          </div>
        </div>
      ) : mandates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No practice mandates found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Start learning by creating your first practice mandate
          </p>
          <button
            onClick={() => navigate('/simulator/mandates/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Practice Mandate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mandates.map((mandate) => (
            <div
              key={mandate.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {mandate.mandate_title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(mandate.document_status)}`}>
                      {mandate.document_status}
                    </span>
                    {mandate.practice_score !== null && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        Score: {mandate.practice_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Reference:</span> {mandate.mandate_reference}
                    {mandate.created_date && (
                      <> | <span className="font-medium">Created:</span> {mandate.created_date}</>
                    )}
                  </p>
                  {mandate.purpose && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {mandate.purpose.substring(0, 200)}...
                    </p>
                  )}
                  {mandate.feedback && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Feedback:</strong> {mandate.feedback}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => navigate(`/simulator/mandates/${mandate.id}/view`)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {mandate.document_status === 'draft' && (
                    <button
                      onClick={() => navigate(`/simulator/mandates/${mandate.id}/edit`)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
