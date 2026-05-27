/**
 * BusinessCaseCreate
 * Multi-section form to create a new Business Case document.
 * Route: /pmo/initiation/business-case/create
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, Save, ArrowLeft } from 'lucide-react'
import { createBusinessCase } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'
import BusinessCaseForm from '../../components/businessCase/BusinessCaseForm'
import { resolveInitiationBasePath } from '../../utils/initiationRouteUtils'

const emptyForm = () => ({
  case_title: '',
  executive_summary: '',
  strategic_alignment: '',
  reasons_for_project: '',
  problem_statement: '',
  recommended_option: '',
  option_justification: '',
  start_date: '',
  end_date: '',
  timescale_description: '',
  key_milestones: '',
  estimated_development_cost: '',
  estimated_ongoing_cost: '',
  funding_source: '',
  cost_assumptions: '',
  npv: '',
  roi_percentage: '',
  payback_period_months: '',
  discount_rate: '',
  investment_appraisal_notes: '',
  major_risks: '',
  overall_risk_rating: '',
})

export default function BusinessCaseCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  const basePath = resolveInitiationBasePath(location.pathname)

  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (updates) => {
    setForm(prev => ({ ...prev, ...updates }))
    // Clear errors for changed fields
    const clearedErrors = { ...errors }
    Object.keys(updates).forEach(k => delete clearedErrors[k])
    if (Object.keys(clearedErrors).length !== Object.keys(errors).length) {
      setErrors(clearedErrors)
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.case_title?.trim()) errs.case_title = 'Title is required'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fix the errors before saving')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        estimated_development_cost: form.estimated_development_cost ? parseFloat(form.estimated_development_cost) : null,
        estimated_ongoing_cost: form.estimated_ongoing_cost ? parseFloat(form.estimated_ongoing_cost) : null,
        npv: form.npv ? parseFloat(form.npv) : null,
        roi_percentage: form.roi_percentage ? parseFloat(form.roi_percentage) : null,
        payback_period_months: form.payback_period_months ? parseInt(form.payback_period_months, 10) : null,
        discount_rate: form.discount_rate ? parseFloat(form.discount_rate) : null,
      }

      const created = await createBusinessCase(payload)
      toast.success(`Business Case ${created.case_reference} created successfully`)
      navigate(`${basePath}/${created.id}/view`)
    } catch (err) {
      console.error('Error creating business case:', err)
      toast.error(err.message || 'Failed to create business case')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(basePath)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Business Cases
        </button>
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Business Case</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Complete all sections to create a new business case document. Required fields are marked with *.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <BusinessCaseForm data={form} onChange={handleChange} errors={errors} />
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => navigate(basePath)}
          className="px-5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Creating...' : 'Create Business Case'}
        </button>
      </div>
    </div>
  )
}
