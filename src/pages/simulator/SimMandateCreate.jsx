import { useState, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, GraduationCap } from 'lucide-react'
import { createSimMandate } from '../../services/simulatorMandateService'
import { bulkCreateSimConstraints } from '../../services/simMandateConstraintService'
import ObjectivesList from '../../components/mandate/ObjectivesList'
import ScopeList from '../../components/mandate/ScopeList'
import ConstraintSelector from '../../components/constraints/ConstraintSelector'
import AuthorityList from '../../components/mandate/AuthorityList'
import InterfacesList from '../../components/mandate/InterfacesList'
import QualityExpectationsList from '../../components/mandate/QualityExpectationsList'

function SimMandateCreate() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    mandate_title: '',
    purpose: '',
    authority_responsible: '',
    background: '',
    project_objectives: '',
    scope: '',
    constraints: '',
    quality_priority: 'balanced',
    outline_business_case: '',
    proposed_executive_name: '',
    proposed_pm_name: '',
    document_status: 'draft',
  })

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || null : value)
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.mandate_title?.trim()) {
      newErrors.mandate_title = 'Mandate title is required'
    }
    if (!formData.purpose?.trim() || formData.purpose.length < 20) {
      newErrors.purpose = 'Purpose is required (minimum 20 characters)'
    }
    if (!formData.background?.trim() || formData.background.length < 100) {
      newErrors.background = 'Background is required (minimum 100 characters)'
    }
    if (!formData.project_objectives?.trim() || formData.project_objectives.length < 100) {
      newErrors.project_objectives = 'Project objectives are required (minimum 100 characters)'
    }
    if (!formData.outline_business_case?.trim() || formData.outline_business_case.length < 100) {
      newErrors.outline_business_case = 'Outline business case is required (minimum 100 characters)'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      const mandate = await createSimMandate(formData)
      
      // Save structured constraints if any
      if (structuredConstraints.length > 0) {
        try {
          const constraintsToSave = structuredConstraints.map(c => ({
            constraint_category_id: c.constraint_category_id || c.constraint_category?.id,
            operand: c.operand,
            value_numeric: c.value_numeric,
            value_min: c.value_min,
            value_max: c.value_max,
            value_text: c.value_text,
            value_date: c.value_date,
            unit: c.unit,
            notes: c.notes
          }))
          
          await bulkCreateSimConstraints(mandate.id, constraintsToSave)
        } catch (constraintError) {
          console.warn('Error saving simulator constraints:', constraintError)
          // Don't fail mandate creation if constraints fail
        }
      }
      
      alert('Practice mandate created successfully! This is for learning purposes.')
      navigate(`/simulator/mandates/${mandate.id}/view`)
    } catch (error) {
      console.error('Error creating practice mandate:', error)
      alert('Error creating practice mandate: ' + error.message)
    } finally {
      setSaving(false)
    }
  }
  
  const getErrorClass = useCallback((fieldName) => {
    return errors[fieldName] 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
  }, [errors])

  const inputClasses = useMemo(() => 
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors',
    []
  )

  const textareaClasses = useMemo(() => 
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-y',
    []
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/simulator/mandates/list')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Practice Mandates
        </button>
        <div className="flex items-center space-x-3">
          <GraduationCap className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Creating Project Mandate</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Learn by practicing mandate creation. This is for learning purposes only.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Learning Mode:</strong> This is a practice exercise. You're learning how to create project mandates in a risk-free environment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Basic Information</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mandate Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="mandate_title"
              value={formData.mandate_title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.mandate_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="e.g., New Customer Portal Development"
              required
            />
            {errors.mandate_title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mandate_title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quality Priority
            </label>
            <select
              name="quality_priority"
              value={formData.quality_priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="balanced">Balanced</option>
              <option value="time">Time</option>
              <option value="cost">Cost</option>
              <option value="quality">Quality</option>
            </select>
          </div>
        </div>

        {/* Section 1: Purpose */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">1. Purpose</h2>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="Why are we documenting this initiative? (Minimum 20 characters)"
            required
          />
          {errors.purpose && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purpose}</p>
          )}
        </div>

        {/* Section 3: Background */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">3. Background</h2>
          <textarea
            name="background"
            value={formData.background}
            onChange={handleChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.background ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="What is the context and need for this project? (Minimum 100 characters)"
            required
          />
          {errors.background && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.background}</p>
          )}
        </div>

        {/* Section 4: Project Objectives */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">4. Project Objectives</h2>
          <textarea
            name="project_objectives"
            value={formData.project_objectives}
            onChange={handleChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.project_objectives ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="What are the measurable objectives? (Minimum 100 characters)"
            required
          />
          {errors.project_objectives && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
          )}
        </div>

        {/* Section 9: Outline Business Case */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">9. Outline Business Case</h2>
          <textarea
            name="outline_business_case"
            value={formData.outline_business_case}
            onChange={handleChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.outline_business_case ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="High-level business justification (Minimum 100 characters)"
            required
          />
          {errors.outline_business_case && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.outline_business_case}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/simulator/mandates/list')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Practice Mandate'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default memo(SimMandateCreate)
