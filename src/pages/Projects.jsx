import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_types:project_type_id (type_name, type_color),
          project_statuses:status_id (status_name, status_color),
          project_methodologies!inner (
            methodologies:methodology_id (methodology_name, methodology_color)
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.project_description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and view all your projects
          </p>
        </div>
        <button
          onClick={() => navigate('/methodology-selection')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'No projects found matching your search' : 'No projects yet'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/methodology-selection')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Your First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {project.project_name}
                </h3>
                {project.project_code && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {project.project_code}
                  </span>
                )}
              </div>

              {project.project_description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {project.project_description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {project.project_statuses && (
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
                  >
                    {project.project_statuses.status_name}
                  </span>
                )}
                {project.project_methodologies && project.project_methodologies[0]?.methodologies && (
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: project.project_methodologies[0].methodologies.methodology_color || '#3B82F6' }}
                  >
                    {project.project_methodologies[0].methodologies.methodology_name}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {project.planned_start_date && project.planned_end_date && (
                  <p>
                    {new Date(project.planned_start_date).toLocaleDateString()} - {new Date(project.planned_end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

