/**
 * BusinessCaseEdit
 * Edit page for a Business Case (only accessible when status is draft or rejected).
 * Route: /pmo/initiation/business-case/:id/edit
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FileText, Save, ArrowLeft, Loader2 } from 'lucide-react'
import {
  getBusinessCaseById,
  canEditBusinessCase,
  updateBusinessCase,
} from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'
import BusinessCaseForm from '../../components/businessCase/BusinessCaseForm'
import BusinessCaseStatusBadge from '../../components/businessCase/BusinessCaseStatusBadge'
import BusinessCaseOptions from '../../components/businessCase/BusinessCaseOptions'
import BusinessCaseBenefits from '../../components/businessCase/BusinessCaseBenefits'
import BusinessCaseDisBenefits from '../../components/businessCase/BusinessCaseDisBenefits'
import BusinessCaseDistribution from '../../components/businessCase/BusinessCaseDistribution'

export default function BusinessCaseEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  const isPMO = location.pathname.startsWith('/pmo')
  const basePath = isPMO ? '/pmo/initiation/business-case' : '/platform/business-case'

  const [businessCase, setBusinessCase] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('main')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [bc, editable] = await Promise.all([
        getBusinessCaseById(id),
        canEditBusinessCase(id),
      ])

      if (!editable) {
        toast.error('This business case cannot be edited in its current status')
        navigate(`${basePath}/${id}/view`)
        return
      }

      setBusinessCase(bc)
      setForm({
        case_title: bc.case_title || '',
        executive_summary: bc.executive_summary || '',
        strategic_alignment: bc.strategic_alignment || '',
        reasons_for_project: bc.reasons_for_project || '',
        problem_statement: bc.problem_statement || '',
        recommended_option: bc.recommended_option || '',
        option_justification: bc.option_justification || '',
        start_date: bc.start_date || '',
        end_date: bc.end_date || '',
        timescale_description: bc.timescale_description || '',
        key_milestones: bc.key_milestones || '',
        estimated_development_cost: bc.estimated_development_cost ?? '',
        estimated_ongoing_cost: bc.estimated_ongoing_cost ?? '',
        funding_source: bc.funding_source || '',
        cost_assumptions: bc.cost_assumptions || '',
        npv: bc.npv ?? '',
        roi_percentage: bc.roi_percentage ?? '',
        payback_period_months: bc.payback_period_months ?? '',
        discount_rate: bc.discount_rate ?? '',
        investment_appraisal_notes: bc.investment_appraisal_notes || '',
        major_risks: bc.major_risks || '',
        overall_risk_rating: bc.overall_risk_rating || '',
      })
    } catch (err) {
      console.error('Error loading business case:', err)
      toast.error(err.message || 'Failed to load business case')
    } finally {
      setLoading(false)
    }
  }, [id, basePath, toast, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChange = (updates) => {
    setForm(prev => ({ ...prev, ...updates }))
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
        estimated_development_cost: form.estimated_development_cost !== '' ? parseFloat(form.estimated_development_cost) : null,
        estimated_ongoing_cost: form.estimated_ongoing_cost !== '' ? parseFloat(form.estimated_ongoing_cost) : null,
        npv: form.npv !== '' ? parseFloat(form.npv) : null,
        roi_percentage: form.roi_percentage !== '' ? parseFloat(form.roi_percentage) : null,
        payback_period_months: form.payback_period_months !== '' ? parseInt(form.payback_period_months, 10) : null,
        discount_rate: form.discount_rate !== '' ? parseFloat(form.discount_rate) : null,
      }

      await updateBusinessCase(id, payload)
      toast.success('Business case saved')
      navigate(`${basePath}/${id}/view`)
    } catch (err) {
      console.error('Error saving business case:', err)
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!businessCase) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/${id}/view`)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to View
        </button>
        <div className="flex items-start gap-3">
          <FileText className="w-7 h-7 text-blue-600 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Business Case</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{businessCase.case_reference}</span>
              <BusinessCaseStatusBadge status={businessCase.document_status} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Main form / Options / Benefits / Dis-benefits / Distribution */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        {[
          { id: 'main', label: 'Document Sections' },
          { id: 'options', label: 'Options' },
          { id: 'benefits', label: 'Benefits' },
          { id: 'disbens', label: 'Dis-benefits' },
          { id: 'distribution', label: 'Distribution' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'main' && (
          <BusinessCaseForm data={form} onChange={handleChange} errors={errors} />
        )}
        {activeTab === 'options' && (
          <BusinessCaseOptions
            caseId={id}
            options={businessCase.options || []}
            readOnly={false}
            onRefresh={fetchData}
          />
        )}
        {activeTab === 'benefits' && (
          <BusinessCaseBenefits
            caseId={id}
            benefits={businessCase.benefits || []}
            readOnly={false}
            onRefresh={fetchData}
          />
        )}
        {activeTab === 'disbens' && (
          <BusinessCaseDisBenefits
            caseId={id}
            disBenefits={businessCase.dis_benefits || []}
            readOnly={false}
            onRefresh={fetchData}
          />
        )}
        {activeTab === 'distribution' && (
          <BusinessCaseDistribution caseId={id} readOnly={false} />
        )}
      </div>

      {/* Save / Cancel — only visible on the main form tab */}
      {activeTab === 'main' && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => navigate(`${basePath}/${id}/view`)}
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
