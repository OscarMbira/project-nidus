import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../services/supabaseClient'

export default function ProjectsEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    project_type_id: '',
    project_status_id: '',
    methodology_id: '',
    start_date: '',
    end_date: '',
    budget: '',
    project_code: ''
  })
  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [methodologies, setMethodologies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchProject()
    fetchLookupData()
  }, [id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_methodologies!inner (
            methodology_id
          )
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setProject(data)

      // Initialize form data
      if (data) {
        const methodologyId = data.project_methodologies?.[0]?.methodology_id || ''
        setFormData({
          project_name: data.project_name || '',
          project_description: data.project_description || '',
          project_type_id: data.project_type_id || '',
          project_status_id: data.status_id || '',
          methodology_id: methodologyId,
          start_date: data.start_date ? format(new Date(data.start_date), 'yyyy-MM-dd') : '',
          end_date: data.end_date ? format(new Date(data.end_date), 'yyyy-MM-dd') : '',
          budget: data.budget || '',
          project_code: data.project_code || ''
        })
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLookupData = async () => {
    try {
      // Fetch project types
      const { data: types, error: typesError } = await supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('type_name', { ascending: true })

      if (typesError) throw typesError

      // Fetch project statuses
      const { data: statuses, error: statusesError } = await supabase
        .from('project_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_name', { ascending: true })

      if (statusesError) throw statusesError

      // Fetch methodologies
      const { data: methods, error: methodsError } = await supabase
        .from('methodologies')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('methodology_name', { ascending: true })

      if (methodsError) throw methodsError

      setProjectTypes(types || [])
      setProjectStatuses(statuses || [])
      setMethodologies(methods || [])
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required'
    }
    if (!formData.project_type_id) {
      newErrors.project_type_id = 'Please select a project type'
    }
    if (!formData.project_status_id) {
      newErrors.project_status_id = 'Please select a project status'
    }
    if (!formData.methodology_id) {
      newErrors.methodology_id = 'Please select a methodology'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        project_name: formData.project_name,
        project_description: formData.project_description || null,
        project_type_id: formData.project_type_id,
        status_id: formData.project_status_id,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        project_code: formData.project_code || null,
        updated_by: user.id
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Update methodology if changed
      if (formData.methodology_id !== project.project_methodologies?.[0]?.methodology_id) {
        // Remove old methodology link
        await supabase
          .from('project_methodologies')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('project_id', id)

        // Add new methodology link
        await supabase
          .from('project_methodologies')
          .insert({
            project_id: id,
            methodology_id: formData.methodology_id,
            created_by: user.id
          })
      }

      navigate('/projects/' + id)
    } catch (error) {
      console.error('Error updating project:', error)
      setErrors({ submit: error.message || 'Failed to update project' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/projects/' + id)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Project
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Update project details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="project_name"
            name="project_name"
            value={formData.project_name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_name ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.project_name && (
            <p className="mt-1 text-sm text-red-600">{errors.project_name}</p>
          )}
        </div>

        {/* Project Description */}
        <div>
          <label htmlFor="project_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Description
          </label>
          <textarea
            id="project_description"
            name="project_description"
            value={formData.project_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Project Type */}
        <div>
          <label htmlFor="project_type_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Type <span className="text-red-500">*</span>
          </label>
          <select
            id="project_type_id"
            name="project_type_id"
            value={formData.project_type_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_type_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a project type</option>
            {projectTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.type_name}
              </option>
            ))}
          </select>
          {errors.project_type_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_type_id}</p>
          )}
        </div>

        {/* Project Status */}
        <div>
          <label htmlFor="project_status_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Status <span className="text-red-500">*</span>
          </label>
          <select
            id="project_status_id"
            name="project_status_id"
            value={formData.project_status_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.project_status_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a project status</option>
            {projectStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.status_name}
              </option>
            ))}
          </select>
          {errors.project_status_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_status_id}</p>
          )}
        </div>

        {/* Methodology */}
        <div>
          <label htmlFor="methodology_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Methodology <span className="text-red-500">*</span>
          </label>
          <select
            id="methodology_id"
            name="methodology_id"
            value={formData.methodology_id}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.methodology_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a methodology</option>
            {methodologies.map((methodology) => (
              <option key={methodology.id} value={methodology.id}>
                {methodology.methodology_name}
              </option>
            ))}
          </select>
          {errors.methodology_id && (
            <p className="mt-1 text-sm text-red-600">{errors.methodology_id}</p>
          )}
        </div>

        {/* Dates and Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Code
            </label>
            <input
              type="text"
              id="project_code"
              name="project_code"
              value={formData.project_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/projects/' + id)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

