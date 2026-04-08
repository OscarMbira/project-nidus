/**
 * Enhanced Risk Form Component
 * Multi-step wizard for creating/editing risks with Cause-Event-Effect structure
 * and pre/post response assessment
 */

import { useState, useEffect } from 'react'
import { X, Save, ArrowRight, ArrowLeft, AlertTriangle, TrendingUp, FileText, Target, Users, CheckCircle } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { createRisk, updateRisk } from '../../services/riskService'

export default function EnhancedRiskForm({ risk, projectId, riskRegisterId, onSave, onCancel }) {
  const [activeStep, setActiveStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Description
    risk_title: '',
    risk_type: 'threat',
    cause_description: '',
    event_description: '',
    effect_description: '',
    risk_category: '',
    sub_category: '',
    tags: [],
    
    // Step 2: Pre-Response Assessment
    pre_probability: 3,
    pre_probability_rationale: '',
    pre_impact: 3,
    pre_impact_rationale: '',
    pre_cost_impact: '',
    pre_schedule_impact_days: '',
    
    // Step 3: Proximity & Response
    proximity: 'within_project',
    proximity_date: '',
    proximity_notes: '',
    response_category: '',
    response_strategy: '',
    contingency_plan: '',
    trigger_conditions: '',
    
    // Step 4: Ownership
    risk_author_id: '',
    risk_owner_id: '',
    risk_actionee_id: '',
    date_registered: new Date().toISOString().split('T')[0],
    
    // Step 5: Links (optional)
    related_product_id: '',
    related_product_name: '',
    escalated_from_issue_id: '',
  })
  
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [newTag, setNewTag] = useState('')
  
  const steps = [
    { id: 1, title: 'Description', icon: FileText, description: 'Cause → Event → Effect' },
    { id: 2, title: 'Assessment', icon: Target, description: 'Pre-Response Assessment' },
    { id: 3, title: 'Response', icon: TrendingUp, description: 'Proximity & Strategy' },
    { id: 4, title: 'Ownership', icon: Users, description: 'Author, Owner, Actionee' },
    { id: 5, title: 'Review', icon: CheckCircle, description: 'Review & Save' }
  ]

  useEffect(() => {
    fetchTeamMembers()
    if (risk) {
      // Populate form from existing risk
      setFormData({
        risk_title: risk.risk_title || '',
        risk_type: risk.risk_type || 'threat',
        cause_description: risk.cause_description || '',
        event_description: risk.event_description || '',
        effect_description: risk.effect_description || '',
        risk_category: risk.risk_category || '',
        sub_category: risk.sub_category || '',
        tags: risk.tags || [],
        pre_probability: risk.pre_probability || 3,
        pre_probability_rationale: risk.pre_probability_rationale || '',
        pre_impact: risk.pre_impact || 3,
        pre_impact_rationale: risk.pre_impact_rationale || '',
        pre_cost_impact: risk.pre_cost_impact?.toString() || '',
        pre_schedule_impact_days: risk.pre_schedule_impact_days?.toString() || '',
        proximity: risk.proximity || 'within_project',
        proximity_date: risk.proximity_date ? risk.proximity_date.split('T')[0] : '',
        proximity_notes: risk.proximity_notes || '',
        response_category: risk.response_category || '',
        response_strategy: risk.response_strategy || '',
        contingency_plan: risk.contingency_plan || '',
        trigger_conditions: risk.trigger_conditions || '',
        risk_author_id: risk.risk_author_id || '',
        risk_owner_id: risk.risk_owner_id || '',
        risk_actionee_id: risk.risk_actionee_id || '',
        date_registered: risk.date_registered ? risk.date_registered.split('T')[0] : new Date().toISOString().split('T')[0],
        related_product_id: risk.related_product_id || '',
        related_product_name: risk.related_product_name || '',
        escalated_from_issue_id: risk.escalated_from_issue_id || '',
      })
    } else {
      // Set current user as author
      setFormData(prev => ({
        ...prev,
        date_registered: new Date().toISOString().split('T')[0]
      }))
    }
  }, [risk, projectId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await platformDb
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
      
      // Set current user as author if new risk
      if (!risk) {
        const { data: { user } } = await platformDb.auth.getUser()
        if (user) {
          const currentUser = members.find(m => m.email === user.email)
          if (currentUser) {
            setFormData(prev => ({ ...prev, risk_author_id: currentUser.id }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    handleChange('tags', formData.tags.filter(t => t !== tagToRemove))
  }

  const validateStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!formData.risk_title || formData.risk_title.trim().length < 10) {
        newErrors.risk_title = 'Risk title must be at least 10 characters'
      }
      if (!formData.cause_description || formData.cause_description.trim().length < 30) {
        newErrors.cause_description = 'Cause description must be at least 30 characters'
      }
      if (!formData.event_description || formData.event_description.trim().length < 30) {
        newErrors.event_description = 'Event description must be at least 30 characters'
      }
      if (!formData.effect_description || formData.effect_description.trim().length < 30) {
        newErrors.effect_description = 'Effect description must be at least 30 characters'
      }
      if (!formData.risk_category) {
        newErrors.risk_category = 'Risk category is required'
      }
    }
    
    if (step === 2) {
      if (!formData.pre_probability || formData.pre_probability < 1 || formData.pre_probability > 5) {
        newErrors.pre_probability = 'Probability must be between 1 and 5'
      }
      if (!formData.pre_impact || formData.pre_impact < 1 || formData.pre_impact > 5) {
        newErrors.pre_impact = 'Impact must be between 1 and 5'
      }
    }
    
    if (step === 3) {
      if (!formData.response_category) {
        newErrors.response_category = 'Response category is required'
      }
      // Validate response category matches risk type
      const threatResponses = ['avoid', 'reduce', 'fallback', 'transfer', 'accept', 'share']
      const opportunityResponses = ['exploit', 'enhance', 'share', 'reject']
      
      if (formData.risk_type === 'threat' && !threatResponses.includes(formData.response_category)) {
        newErrors.response_category = 'Response category must be appropriate for threats'
      }
      if (formData.risk_type === 'opportunity' && !opportunityResponses.includes(formData.response_category)) {
        newErrors.response_category = 'Response category must be appropriate for opportunities'
      }
    }
    
    if (step === 4) {
      if (!formData.risk_owner_id) {
        newErrors.risk_owner_id = 'Risk owner is required'
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

  const calculateRiskScore = () => {
    return formData.pre_probability * formData.pre_impact
  }

  const getRiskLevel = (score) => {
    if (score >= 20) return { level: 'very_high', label: 'Very High', color: 'bg-red-600' }
    if (score >= 12) return { level: 'high', label: 'High', color: 'bg-orange-600' }
    if (score >= 6) return { level: 'medium', label: 'Medium', color: 'bg-yellow-600' }
    if (score >= 3) return { level: 'low', label: 'Low', color: 'bg-green-600' }
    return { level: 'very_low', label: 'Very Low', color: 'bg-gray-600' }
  }

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return
    }

    setSaving(true)
    try {
      const submitData = {
        ...formData,
        risk_register_id: riskRegisterId,
        project_id: projectId,
        pre_cost_impact: formData.pre_cost_impact ? parseFloat(formData.pre_cost_impact) : null,
        pre_schedule_impact_days: formData.pre_schedule_impact_days ? parseInt(formData.pre_schedule_impact_days) : null,
        proximity_date: formData.proximity_date || null,
        related_product_id: formData.related_product_id || null,
        escalated_from_issue_id: formData.escalated_from_issue_id || null,
        risk_author_id: formData.risk_author_id || null,
        risk_owner_id: formData.risk_owner_id || null,
        risk_actionee_id: formData.risk_actionee_id || null,
        status: risk?.status || 'identified'
      }

      let result
      if (risk) {
        result = await updateRisk(risk.id, submitData)
      } else {
        result = await createRisk(submitData)
      }

      if (result.success) {
        onSave()
      } else {
        alert('Error: ' + (result.error || 'Failed to save risk'))
      }
    } catch (error) {
      console.error('Error saving risk:', error)
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    const riskScore = calculateRiskScore()
    const riskLevel = getRiskLevel(riskScore)

    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Risk Description (Cause → Event → Effect)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Describe the risk using a structured approach: what could cause it, what the event would be, and what the effect would be.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Title * <span className="text-xs text-gray-500">(Brief summary, min 10 characters)</span>
              </label>
              <input
                type="text"
                value={formData.risk_title}
                onChange={(e) => handleChange('risk_title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.risk_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., Key vendor may not deliver on time"
              />
              {errors.risk_title && <p className="text-sm text-red-600 mt-1">{errors.risk_title}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="risk_type"
                      value="threat"
                      checked={formData.risk_type === 'threat'}
                      onChange={(e) => handleChange('risk_type', e.target.value)}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm">Threat (Negative)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="risk_type"
                      value="opportunity"
                      checked={formData.risk_type === 'opportunity'}
                      onChange={(e) => handleChange('risk_type', e.target.value)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm">Opportunity (Positive)</span>
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.risk_category}
                  onChange={(e) => handleChange('risk_category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.risk_category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Category</option>
                  <option value="schedule">Schedule</option>
                  <option value="cost">Cost</option>
                  <option value="quality">Quality</option>
                  <option value="scope">Scope</option>
                  <option value="resource">Resource</option>
                  <option value="technical">Technical</option>
                  <option value="legal">Legal</option>
                  <option value="regulatory">Regulatory</option>
                  <option value="commercial">Commercial</option>
                  <option value="operational">Operational</option>
                  <option value="strategic">Strategic</option>
                  <option value="external">External</option>
                  <option value="organizational">Organizational</option>
                  <option value="other">Other</option>
                </select>
                {errors.risk_category && <p className="text-sm text-red-600 mt-1">{errors.risk_category}</p>}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3">CAUSE: Because of...</h4>
              <textarea
                value={formData.cause_description}
                onChange={(e) => handleChange('cause_description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.cause_description ? 'border-red-500' : 'border-blue-300 dark:border-blue-700'
                }`}
                placeholder="What could cause this risk? e.g., Vendor has resource constraints and competing priorities..."
              />
              {errors.cause_description && <p className="text-sm text-red-600 mt-1">{errors.cause_description}</p>}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-3">EVENT: There is a risk that...</h4>
              <textarea
                value={formData.event_description}
                onChange={(e) => handleChange('event_description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.event_description ? 'border-red-500' : 'border-yellow-300 dark:border-yellow-700'
                }`}
                placeholder="The risk event itself. e.g., The vendor may fail to deliver the critical component by the agreed date..."
              />
              {errors.event_description && <p className="text-sm text-red-600 mt-1">{errors.event_description}</p>}
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-900 dark:text-red-300 mb-3">EFFECT: Which would result in...</h4>
              <textarea
                value={formData.effect_description}
                onChange={(e) => handleChange('effect_description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.effect_description ? 'border-red-500' : 'border-red-300 dark:border-red-700'
                }`}
                placeholder="Impact if risk occurs. e.g., 3-week delay to Phase 2 and additional costs of $50,000..."
              />
              {errors.effect_description && <p className="text-sm text-red-600 mt-1">{errors.effect_description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sub-Category
              </label>
              <input
                type="text"
                value={formData.sub_category}
                onChange={(e) => handleChange('sub_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Optional sub-category"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Pre-Response Assessment (Inherent Risk)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Assess the risk before any response actions are taken.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Probability (1-5) *
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.pre_probability}
                    onChange={(e) => handleChange('pre_probability', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white w-12 text-center">
                    {formData.pre_probability}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
                </p>
                <textarea
                  value={formData.pre_probability_rationale}
                  onChange={(e) => handleChange('pre_probability_rationale', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Rationale for probability assessment..."
                />
                {errors.pre_probability && <p className="text-sm text-red-600 mt-1">{errors.pre_probability}</p>}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Impact (1-5) *
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.pre_impact}
                    onChange={(e) => handleChange('pre_impact', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white w-12 text-center">
                    {formData.pre_impact}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
                </p>
                <textarea
                  value={formData.pre_impact_rationale}
                  onChange={(e) => handleChange('pre_impact_rationale', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Rationale for impact assessment..."
                />
                {errors.pre_impact && <p className="text-sm text-red-600 mt-1">{errors.pre_impact}</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Expected Value:</span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{riskScore}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Risk Level:</span>
                  <p className={`text-xl font-semibold ${riskLevel.color} text-white px-3 py-1 rounded inline-block mt-1`}>
                    {riskLevel.label}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Calculation:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formData.pre_probability} × {formData.pre_impact} = {riskScore}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Cost Impact ($)
                </label>
                <input
                  type="number"
                  value={formData.pre_cost_impact}
                  onChange={(e) => handleChange('pre_cost_impact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Schedule Impact (Days)
                </label>
                <input
                  type="number"
                  value={formData.pre_schedule_impact_days}
                  onChange={(e) => handleChange('pre_schedule_impact_days', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        const threatResponses = [
          { value: 'avoid', label: 'Avoid - Change plan to eliminate threat' },
          { value: 'reduce', label: 'Reduce - Take action to reduce probability/impact' },
          { value: 'fallback', label: 'Fallback - Have contingency plan' },
          { value: 'transfer', label: 'Transfer - Pass to third party' },
          { value: 'accept', label: 'Accept - Acknowledge and monitor' },
          { value: 'share', label: 'Share - Share with another party' }
        ]
        
        const opportunityResponses = [
          { value: 'exploit', label: 'Exploit - Ensure opportunity is realized' },
          { value: 'enhance', label: 'Enhance - Increase probability/positive impact' },
          { value: 'share', label: 'Share - Share with party better able to capture' },
          { value: 'reject', label: 'Reject - Choose not to pursue' }
        ]
        
        const responseOptions = formData.risk_type === 'threat' ? threatResponses : opportunityResponses

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Proximity & Response Strategy
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proximity *
                </label>
                <select
                  value={formData.proximity}
                  onChange={(e) => handleChange('proximity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="imminent">Imminent</option>
                  <option value="within_stage">Within Stage</option>
                  <option value="within_project">Within Project</option>
                  <option value="beyond_project">Beyond Project</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proximity Date
                </label>
                <input
                  type="date"
                  value={formData.proximity_date}
                  onChange={(e) => handleChange('proximity_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {formData.proximity_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proximity Notes
                </label>
                <textarea
                  value={formData.proximity_notes}
                  onChange={(e) => handleChange('proximity_notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Category * <span className="text-xs text-gray-500">({formData.risk_type === 'threat' ? 'Threat responses' : 'Opportunity responses'})</span>
              </label>
              <select
                value={formData.response_category}
                onChange={(e) => handleChange('response_category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.response_category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Response Category</option>
                {responseOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.response_category && <p className="text-sm text-red-600 mt-1">{errors.response_category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Strategy Description
              </label>
              <textarea
                value={formData.response_strategy}
                onChange={(e) => handleChange('response_strategy', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the overall response strategy..."
              />
            </div>

            {(formData.response_category === 'fallback' || formData.response_category === 'reduce') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contingency Plan
                  </label>
                  <textarea
                    value={formData.contingency_plan}
                    onChange={(e) => handleChange('contingency_plan', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Describe contingency/fallback actions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trigger Conditions
                  </label>
                  <textarea
                    value={formData.trigger_conditions}
                    onChange={(e) => handleChange('trigger_conditions', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="When to activate contingency plan..."
                  />
                </div>
              </>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Risk Ownership & Responsibility
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Define who raised the risk, who owns it, and who will implement responses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Registered *
                </label>
                <input
                  type="date"
                  value={formData.date_registered}
                  onChange={(e) => handleChange('date_registered', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Author (Who raised it) *
                </label>
                <select
                  value={formData.risk_author_id}
                  onChange={(e) => handleChange('risk_author_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Author</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Owner (Who manages it) * <span className="text-xs text-gray-500">Required</span>
                </label>
                <select
                  value={formData.risk_owner_id}
                  onChange={(e) => handleChange('risk_owner_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.risk_owner_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Owner</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
                {errors.risk_owner_id && <p className="text-sm text-red-600 mt-1">{errors.risk_owner_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Actionee (Who implements response) <span className="text-xs text-gray-500">Optional</span>
                </label>
                <select
                  value={formData.risk_actionee_id}
                  onChange={(e) => handleChange('risk_actionee_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Review Risk Information
              </h3>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Risk Summary</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Title:</strong> {formData.risk_title || 'Not set'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Type:</strong> {formData.risk_type === 'threat' ? 'Threat' : 'Opportunity'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Category:</strong> {formData.risk_category || 'Not set'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Assessment</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Pre-Response:</strong> P={formData.pre_probability}, I={formData.pre_impact}, Score={calculateRiskScore()} ({getRiskLevel(calculateRiskScore()).label})
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Response:</strong> {formData.response_category || 'Not set'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Proximity:</strong> {formData.proximity ? formData.proximity.replace('_', ' ') : 'Not set'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Ownership</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Author:</strong> {teamMembers.find(m => m.id === formData.risk_author_id)?.full_name || 'Not set'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Owner:</strong> {teamMembers.find(m => m.id === formData.risk_owner_id)?.full_name || 'Not set'}
                </p>
                {formData.risk_actionee_id && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Actionee:</strong> {teamMembers.find(m => m.id === formData.risk_actionee_id)?.full_name}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    Note: Response actions can be added after saving the risk
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    You can add detailed response actions, track their status, and update post-response assessment in the risk detail view.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {risk ? 'Edit Risk' : 'Create Risk'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Step {activeStep} of {steps.length}: {steps.find(s => s.id === activeStep)?.title}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activeStep === step.id
                        ? 'bg-blue-600 text-white'
                        : activeStep > step.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {activeStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      activeStep > step.id ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={activeStep === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          {activeStep < steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : risk ? 'Update Risk' : 'Create Risk'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
