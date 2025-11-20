import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Plus, FileText, BarChart3, Calendar, Search, Filter, Edit2, Trash2, Play } from 'lucide-react'
import Pagination from '../components/Pagination'

export default function Reports() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    template_category: '',
    template_type: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    fetchTemplates()
  }, [filters, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      
      let countQuery = supabase
        .from('report_templates')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)

      let query = supabase
        .from('report_templates')
        .select('*')
        .eq('is_deleted', false)

      if (filters.template_category) {
        query = query.eq('template_category', filters.template_category)
        countQuery = countQuery.eq('template_category', filters.template_category)
      }
      if (filters.template_type) {
        query = query.eq('template_type', filters.template_type)
        countQuery = countQuery.eq('template_type', filters.template_type)
      }
      if (filters.search) {
        query = query.or(`template_name.ilike.%${filters.search}%,template_description.ilike.%${filters.search}%`)
        countQuery = countQuery.or(`template_name.ilike.%${filters.search}%,template_description.ilike.%${filters.search}%`)
      }

      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error } = await query
        .order('template_name', { ascending: true })
        .range(from, to)

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      alert('Error loading templates: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete template "${template.template_name}"?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('report_templates')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', template.id)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template: ' + error.message)
    }
  }

  const handleRunReport = (template) => {
    navigate(`/reports/builder?template=${template.id}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Reports & Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create, manage, and run custom reports
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => navigate('/reports/builder')}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Report
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Build a custom report with filters and visualizations
          </p>
        </button>

        <button
          onClick={() => navigate('/reports/analytics')}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View analytics dashboards and KPIs
          </p>
        </button>

        <button
          onClick={() => navigate('/reports/scheduled')}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Scheduled Reports
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage automated report schedules
          </p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.template_category}
            onChange={(e) => setFilters({ ...filters, template_category: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="project">Project</option>
            <option value="resource">Resource</option>
            <option value="task">Task</option>
            <option value="financial">Financial</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={filters.template_type}
            onChange={(e) => setFilters({ ...filters, template_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="custom">Custom</option>
            <option value="prebuilt">Pre-built</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report Templates ({totalCount})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Report Templates</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Create your first report template</p>
            <button
              onClick={() => navigate('/reports/builder')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Create Report
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {template.template_name}
                      </h3>
                      {template.template_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {template.template_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {template.template_category && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {template.template_category}
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {template.template_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunReport(template)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center justify-center gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Run
                    </button>
                    <button
                      onClick={() => navigate(`/reports/builder?template=${template.id}`)}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="px-3 py-2 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-300 dark:hover:bg-red-900/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {totalCount > itemsPerPage && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalCount / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalCount}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

