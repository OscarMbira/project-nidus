import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function ProjectsCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedMethodology = location.state?.selectedMethodology

  const [formData, setFormData] = useState({
    project_name: '',
    project_description: '',
    project_type_id: '',
    project_status_id: '',
    methodology_id: selectedMethodology?.id || '',
    start_date: '',
    end_date: '',
    budget: '',
    project_code: ''
  })

  const [projectTypes, setProjectTypes] = useState([])
  const [projectStatuses, setProjectStatuses] = useState([])
  const [methodologies, setMethodologies] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchLookupData()
  }, [])

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

      // Fetch project statuses (initial status)
      const { data: statuses, error: statusesError } = await supabase
        .from('project_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('is_initial_status', true)

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

      // Set default status if available
      if (statuses && statuses.length > 0) {
        setFormData(prev => ({ ...prev, project_status_id: statuses[0].id }))
      }

      // Set default type if available
      if (types && types.length > 0) {
        const defaultType = types.find(t => t.is_default) || types[0]
        setFormData(prev => ({ ...prev, project_type_id: defaultType.id }))
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

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required'
    }

    if (!formData.methodology_id) {
      newErrors.methodology_id = 'Please select a methodology'
    }

    if (!formData.project_type_id) {
      newErrors.project_type_id = 'Please select a project type'
    }

    if (!formData.project_status_id) {
      newErrors.project_status_id = 'Please select a project status'
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'End date must be after start date'
      }
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

      // Generate project code if not provided
      let projectCode = formData.project_code
      if (!projectCode) {
        // Auto-generate project code (simple implementation)
        const timestamp = Date.now().toString().slice(-6)
        projectCode = `PRJ-${timestamp}`
      }

      // Create project
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          project_name: formData.project_name,
          project_description: formData.project_description || null,
          project_code: projectCode,
          project_type_id: formData.project_type_id,
          status_id: formData.project_status_id,  // Note: column is 'status_id' not 'project_status_id'
          planned_start_date: formData.start_date || null,
          planned_end_date: formData.end_date || null,
          budget_amount: formData.budget ? parseFloat(formData.budget) : null,
          owner_user_id: user.id,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Link methodology to project
      if (formData.methodology_id) {
        const { error: linkError } = await supabase
          .from('project_methodologies')
          .insert({
            project_id: project.id,
            methodology_id: formData.methodology_id,
            is_active: true,
            created_by: user.id
          })

        if (linkError) {
          console.error('Error linking methodology:', linkError)
          // Don't throw - project is created, just methodology link failed
        }
      }

      // Navigate to project detail
      navigate(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      setErrors({ submit: error.message || 'Failed to create project' })
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
          Create New Project
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fill in the details to create your new project
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
            placeholder="Enter project name"
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
            placeholder="Describe your project..."
          />
        </div>

        {/* Methodology Selection */}
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
                {methodology.is_default ? ' (Default)' : ''}
              </option>
            ))}
          </select>
          {errors.methodology_id && (
            <p className="mt-1 text-sm text-red-600">{errors.methodology_id}</p>
          )}
          {selectedMethodology && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Pre-selected: {selectedMethodology.methodology_name}
            </p>
          )}
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
            Initial Status <span className="text-red-500">*</span>
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
            <option value="">Select a status</option>
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
            )}
          </div>
        </div>

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
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
        </div>

        {/* Project Code */}
        <div>
          <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Code (Optional)
          </label>
          <input
            type="text"
            id="project_code"
            name="project_code"
            value={formData.project_code}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="e.g., PRJ-2025-001"
          />
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
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

