import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [projects, setProjects] = useState([])
  const [taskStatuses, setTaskStatuses] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchTasks()
    fetchProjects()
    fetchTaskStatuses()
  }, [filterStatus, filterProject])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchTaskStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_order', { ascending: true })

      if (error) throw error
      setTaskStatuses(data || [])
    } catch (error) {
      console.error('Error fetching task statuses:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (id, project_name, project_code),
          task_statuses:status_id (status_name, status_color),
          assigned_user:assigned_to_user_id (id, full_name, email)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status_id', filterStatus)
      }

      if (filterProject !== 'all') {
        query = query.eq('project_id', filterProject)
      }

      const { data, error } = await query

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          console.log('Tasks table not found - please run v06_task_management_tables.sql first')
          setTasks([])
        } else {
          throw error
        }
      } else {
        setTasks(data || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.task_description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tasks
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and track all your tasks
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/tasks/board')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
          >
            Board View
          </button>
          <button
            onClick={() => navigate('/tasks/calendar')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
          >
            Calendar View
          </button>
          <button
            onClick={() => navigate('/tasks/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Statuses</option>
            {taskStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.status_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || filterStatus !== 'all' || filterProject !== 'all'
              ? 'No tasks found matching your filters'
              : 'No tasks yet'}
          </p>
          {!searchTerm && filterStatus === 'all' && filterProject === 'all' && (
            <button
              onClick={() => navigate('/tasks/create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Your First Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {task.task_name}
                    </h3>
                    {task.task_code && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.task_code}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority || 'medium'}
                    </span>
                  </div>
                  {task.task_description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {task.task_description}
                    </p>
                  )}
                </div>
                {task.task_statuses && (
                  <span
                    className="px-3 py-1 text-sm rounded text-white ml-4"
                    style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                  >
                    {task.task_statuses.status_name}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  {task.projects && (
                    <div className="flex items-center gap-1">
                      <span>📁</span>
                      <span>{task.projects.project_name}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.estimated_hours && (
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>{task.estimated_hours}h</span>
                    </div>
                  )}
                </div>
                {task.assigned_user && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                        {task.assigned_user.full_name?.charAt(0) || task.assigned_user.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span>{task.assigned_user.full_name || task.assigned_user.email}</span>
                  </div>
                )}
              </div>

              {task.percentage_complete > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{task.percentage_complete}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${task.percentage_complete}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
