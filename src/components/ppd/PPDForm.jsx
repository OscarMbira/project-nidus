import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, FileText, Package, BookOpen, Users, Award, Target, Settings } from 'lucide-react'
import { createPPD, updatePPD, createPPDFromMandate } from '../../services/projectProductDescriptionService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function PPDForm({ ppd, projectId, mandateId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    product_title: '',
    purpose: '',
    composition: '',
    derivation: '',
    development_skills_required: '',
    resource_areas: '',
    customer_quality_expectations: '',
    quality_characteristics: '',
    quality_management_system: '',
    applicable_standards: '',
    satisfaction_targets: '',
    project_quality_tolerances: '',
    acceptance_method: '',
    acceptance_responsibilities: '',
    handover_arrangements: '',
    phased_handover: false,
    author_id: '',
    owner_id: '',
    client_id: '',
    status: 'draft'
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeStep, setActiveStep] = useState(1)

  const steps = [
    { id: 1, title: 'Title & Purpose', icon: FileText },
    { id: 2, title: 'Composition', icon: Package },
    { id: 3, title: 'Skills', icon: Users },
    { id: 4, title: 'Quality', icon: Award },
    { id: 5, title: 'Acceptance', icon: Target },
    { id: 6, title: 'Review', icon: Settings }
  ]

  useEffect(() => {
    fetchTeamMembers()

    if (ppd) {
      setFormData({
        product_title: ppd.product_title || '',
        purpose: ppd.purpose || '',
        composition: ppd.composition || '',
        derivation: ppd.derivation || '',
        development_skills_required: ppd.development_skills_required || '',
        resource_areas: ppd.resource_areas || '',
        customer_quality_expectations: ppd.customer_quality_expectations || '',
        quality_characteristics: ppd.quality_characteristics || '',
        quality_management_system: ppd.quality_management_system || '',
        applicable_standards: ppd.applicable_standards || '',
        satisfaction_targets: ppd.satisfaction_targets || '',
        project_quality_tolerances: ppd.project_quality_tolerances || '',
        acceptance_method: ppd.acceptance_method || '',
        acceptance_responsibilities: ppd.acceptance_responsibilities || '',
        handover_arrangements: ppd.handover_arrangements || '',
        phased_handover: ppd.phased_handover || false,
        author_id: ppd.author_id || '',
        owner_id: ppd.owner_id || '',
        client_id: ppd.client_id || '',
        status: ppd.status || 'draft'
      })
    } else if (mandateId) {
      // Pre-populate from mandate
      handleCreateFromMandate()
    }
  }, [ppd, mandateId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error

      const members = (data || [])
        .map(up => up.user)
        .filter(u => u)

      setTeamMembers(members)
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleCreateFromMandate = async () => {
    try {
      setSaving(true)
      const createdPPD = await createPPDFromMandate(mandateId, projectId)
      if (createdPPD) {
        setFormData({
          product_title: createdPPD.product_title || '',
          purpose: createdPPD.purpose || '',
          composition: createdPPD.composition || '',
          derivation: createdPPD.derivation || '',
          development_skills_required: createdPPD.development_skills_required || '',
          resource_areas: createdPPD.resource_areas || '',
          customer_quality_expectations: createdPPD.customer_quality_expectations || '',
          quality_characteristics: createdPPD.quality_characteristics || '',
          quality_management_system: createdPPD.quality_management_system || '',
          applicable_standards: createdPPD.applicable_standards || '',
          satisfaction_targets: createdPPD.satisfaction_targets || '',
          project_quality_tolerances: createdPPD.project_quality_tolerances || '',
          acceptance_method: createdPPD.acceptance_method || '',
          acceptance_responsibilities: createdPPD.acceptance_responsibilities || '',
          handover_arrangements: createdPPD.handover_arrangements || '',
          phased_handover: createdPPD.phased_handover || false,
          author_id: createdPPD.author_id || '',
          owner_id: createdPPD.owner_id || '',
          client_id: createdPPD.client_id || '',
          status: createdPPD.status || 'draft'
        })
        alert('PPD pre-populated from mandate!')
      }
    } catch (error) {
      console.error('Error creating from mandate:', error)
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
    
    // Clear error when field is touched
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.product_title || formData.product_title.trim().length < 10) {
        newErrors.product_title = 'Product title must be at least 10 characters'
      }
      if (!formData.purpose || formData.purpose.trim().length < 50) {
        newErrors.purpose = 'Purpose must be at least 50 characters'
      }
    }

    if (step === 5) {
      if (!formData.acceptance_method || formData.acceptance_method.trim().length < 30) {
        newErrors.acceptance_method = 'Acceptance method must be at least 30 characters'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const handlePrevious = () => {
    setActiveStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all steps
    let isValid = true
    for (let i = 1; i <= steps.length; i++) {
      if (!validateStep(i)) {
        isValid = false
        setActiveStep(i)
        break
      }
    }

    if (!isValid) {
      alert('Please fix validation errors before saving')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      if (ppd) {
        await updatePPD(ppd.id, {
          ...formData,
          author_id: formData.author_id || userData.id,
          owner_id: formData.owner_id || userData.id
        })
        alert('Project Product Description updated successfully!')
      } else {
        await createPPD(projectId, {
          ...formData,
          author_id: formData.author_id || userData.id,
          owner_id: formData.owner_id || userData.id
        })
        alert('Project Product Description created successfully!')
      }

      onSave()
    } catch (error) {
      console.error('Error saving PPD:', error)
      alert('Error saving PPD: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                name="product_title"
                value={formData.product_title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.product_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Name by which the project is known"
              />
              {errors.product_title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.product_title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose *
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Purpose the project product will fulfill and who will use it (minimum 50 characters)"
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purpose}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Composition
              </label>
              <textarea
                name="composition"
                value={formData.composition}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Description of major products to be delivered"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Derivation
              </label>
              <textarea
                name="derivation"
                value={formData.derivation}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Source products from which this is derived"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Composition items can be added in the Composition section after saving the PPD.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Composition Summary
              </label>
              <textarea
                name="composition"
                value={formData.composition}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="High-level description of major products/deliverables"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Development Skills Required
              </label>
              <textarea
                name="development_skills_required"
                value={formData.development_skills_required}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Skills needed to develop the product"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource Areas
              </label>
              <textarea
                name="resource_areas"
                value={formData.resource_areas}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Which areas should supply resources"
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Quality Expectations *
              </label>
              <textarea
                name="customer_quality_expectations"
                value={formData.customer_quality_expectations}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Quality expected and standards/processes (minimum 50 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Characteristics
              </label>
              <textarea
                name="quality_characteristics"
                value={formData.quality_characteristics}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Key quality characteristics (fast/slow, large/small, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Management System
              </label>
              <textarea
                name="quality_management_system"
                value={formData.quality_management_system}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Customer's QMS elements to use"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applicable Standards
              </label>
              <textarea
                name="applicable_standards"
                value={formData.applicable_standards}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Other standards to apply"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Satisfaction Targets
              </label>
              <textarea
                name="satisfaction_targets"
                value={formData.satisfaction_targets}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Customer/staff satisfaction targets"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Quality Tolerances
              </label>
              <textarea
                name="project_quality_tolerances"
                value={formData.project_quality_tolerances}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Tolerances for acceptance criteria"
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Acceptance Method *
              </label>
              <textarea
                name="acceptance_method"
                value={formData.acceptance_method}
                onChange={handleChange}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.acceptance_method ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="How acceptance will be confirmed (minimum 30 characters)"
              />
              {errors.acceptance_method && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.acceptance_method}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Acceptance Responsibilities
              </label>
              <textarea
                name="acceptance_responsibilities"
                value={formData.acceptance_responsibilities}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Who confirms acceptance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Handover Arrangements
              </label>
              <textarea
                name="handover_arrangements"
                value={formData.handover_arrangements}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Complex handover details if applicable"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="phased_handover"
                checked={formData.phased_handover}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Phased handover planned
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Author
                </label>
                <select
                  name="author_id"
                  value={formData.author_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {teamMembers.map((member, index) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner
                </label>
                <select
                  name="owner_id"
                  value={formData.owner_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client
                </label>
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {teamMembers.map((member, index) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Review Summary</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Product Title:</strong> {formData.product_title || 'Not defined'}
                </div>
                <div>
                  <strong>Purpose:</strong> {formData.purpose ? `${formData.purpose.substring(0, 100)}...` : 'Not defined'}
                </div>
                <div>
                  <strong>Composition:</strong> {formData.composition ? 'Defined' : 'Not defined'}
                </div>
                <div>
                  <strong>Quality Expectations:</strong> {formData.customer_quality_expectations ? 'Defined' : 'Not defined'}
                </div>
                <div>
                  <strong>Acceptance Method:</strong> {formData.acceptance_method ? 'Defined' : 'Not defined'}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review your entries above. Click "Save" to create/update the Project Product Description.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {ppd ? 'Edit PPD' : 'Create Project Product Description'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = activeStep === step.id
              const isCompleted = activeStep > step.id
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive ? 'border-blue-600 bg-blue-600 text-white' :
                      isCompleted ? 'border-green-600 bg-green-600 text-white' :
                      'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`ml-2 text-sm font-medium hidden md:block ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {renderStepContent()}

          <div className="flex justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              {activeStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save PPD'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
