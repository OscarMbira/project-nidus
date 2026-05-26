import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../services/supabaseClient'
import { useOfflineQueue } from '../hooks/useOfflineQueue'

import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
export default function TasksCreate() {
  useOfflineQueue()
  const navigate = useNavigate()
  const location = useLocation()
  const projectId = location.state?.projectId
  const dueDate = location.state?.dueDate

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return format(d, 'yyyy-MM-dd')
  }

  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    project_id: projectId || '',
    status_id: '',
    priority: 'medium',
    assigned_to_user_id: '',
    due_date: dueDate ? formatDateForInput(dueDate) : '',
    estimated_hours: '',
    estimated_duration_days: '',
    task_type: 'task'
  })

  const [projects, setProjects] = useState([])
  const [taskStatuses, setTaskStatuses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchLookupData()
  }, [])

  const fetchLookupData = async () => {
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (projectsError) throw projectsError

      // Fetch task statuses (initial status)
      const { data: statusesData, error: statusesError } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('is_initial_status', true)
        .order('status_order', { ascending: true })

      if (statusesError) throw statusesError

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })

      if (usersError) throw usersError

      setProjects(projectsData || [])
      setTaskStatuses(statusesData || [])
      setUsers(usersData || [])

      // Set default status if available
      if (statusesData && statusesData.length > 0) {
        setFormData(prev => ({ ...prev, status_id: statusesData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.task_name.trim()) {
      newErrors.task_name = 'Task name is required'
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project'
    }

    if (!formData.status_id) {
      newErrors.status_id = 'Please select a status'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Create task
      const taskData = {
        task_name: formData.task_name,
        task_description: formData.task_description || null,
        project_id: formData.project_id,
        status_id: formData.status_id,
        priority: formData.priority,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        assigned_by_user_id: formData.assigned_to_user_id ? user.id : null,
        due_date: formData.due_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        estimated_duration_days: formData.estimated_duration_days ? parseInt(formData.estimated_duration_days) : null,
        task_type: formData.task_type,
        created_by: user.id
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) throw error

      // Create task assignment if user is assigned
      if (formData.assigned_to_user_id) {
        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert({
            task_id: task.id,
            user_id: formData.assigned_to_user_id,
            assignment_type: 'assignee',
            assigned_by_user_id: user.id,
            created_by: user.id
          })

        if (assignmentError) {
          console.error('Error creating task assignment:', assignmentError)
        }
      }

      // Navigate to task detail
      navigate(`/tasks/${task.id}`)
    } catch (error) {
      console.error('Error creating task:', error)
      setErrors({ submit: error.message || 'Failed to create task' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create New Task
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fill in the details to create your new task
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Name */}
        <div>
          <label htmlFor="task_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="task_name"
            name="task_name"
            value={formData.task_name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.task_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter task name"
            required
          />
          {errors.task_name && (
            <p className="mt-1 text-sm text-red-600">{errors.task_name}</p>
          )}
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Description
          </label>
          <textarea
            id="task_description"
            name="task_description"
            value={formData.task_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Describe the task..."
          />
        </div>

        {/* Project Selection */}
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project <span className="text-red-500">*</span>
          </label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a project</option>
            {projects.map((project, index) => (
              <option key={project.id} value={project.id}>
                {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
          )}
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status_id"
              name="status_id"
              value={formData.status_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.status_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a status</option>
              {taskStatuses.map((status, index) => (
                <option key={status.id} value={status.id}>
                  {status.status_name}
                </option>
              ))}
            </select>
            {errors.status_id && (
              <p className="mt-1 text-sm text-red-600">{errors.status_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Assignment */}
        <div>
          <label htmlFor="assigned_to_user_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign To
          </label>
          <select
            id="assigned_to_user_id"
            name="assigned_to_user_id"
            value={formData.assigned_to_user_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Unassigned</option>
            {users.map((user, index) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>

        {/* Dates and Estimates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Hours
            </label>
            <input
              type="number"
              id="estimated_hours"
              name="estimated_hours"
              value={formData.estimated_hours}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="estimated_duration_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              id="estimated_duration_days"
              name="estimated_duration_days"
              value={formData.estimated_duration_days}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="0"
            />
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}

