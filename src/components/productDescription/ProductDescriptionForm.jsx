/**
 * Product Description Form Component
 * Wizard-style form for creating/editing Product Descriptions
 */

import { useState, useEffect } from 'react'
import { FileText, Package, BookOpen, Target, Award, Users, CheckCircle, ArrowRight, ArrowLeft, X, Save } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { HoldButton } from '../ui/HoldButton'
import { createProductDescription, updateProductDescription, getProductDescriptionById, validateCompleteness, validateAcceptanceCriteriaQuality } from '../../services/productDescriptionService'
import { getCompositionItems } from '../../services/pdCompositionItemsService'
import { getDerivations } from '../../services/pdDerivationsService'
import { getAcceptanceCriteria } from '../../services/pdAcceptanceCriteriaService'
import { getQualityExpectations } from '../../services/pdQualityExpectationsService'
import { getSkills } from '../../services/pdSkillsRequiredService'
import { getResponsibilities } from '../../services/pdAcceptanceResponsibilitiesService'
import { supabase } from '../../services/supabaseClient'
import PDIntroductionSection from './PDIntroductionSection'
import PDCompositionSection from './PDCompositionSection'
import PDDerivationsSection from './PDDerivationsSection'
import PDAcceptanceCriteriaSection from './PDAcceptanceCriteriaSection'
import PDQualityExpectationsSection from './PDQualityExpectationsSection'
import PDSkillsSection from './PDSkillsSection'
import PDAcceptanceResponsibilitiesSection from './PDAcceptanceResponsibilitiesSection'
import CompletenessIndicator from './CompletenessIndicator'
import AcceptanceCriteriaQualityChecker from './AcceptanceCriteriaQualityChecker'
import PDTemplateSelector from './PDTemplateSelector'
import { createPDFromTemplate } from '../../services/productDescriptionTemplateService'

const FORM_STEPS = [
  { id: 'introduction', label: 'Introduction', icon: FileText, description: 'Product title, purpose' },
  { id: 'composition', label: 'Composition', icon: Package, description: 'Sub-products if composite' },
  { id: 'derivation', label: 'Derivation', icon: BookOpen, description: 'Source products/specifications' },
  { id: 'acceptance', label: 'Acceptance Criteria', icon: Target, description: 'Acceptance criteria' },
  { id: 'quality', label: 'Quality', icon: Award, description: 'Quality expectations' },
  { id: 'skills', label: 'Skills', icon: Users, description: 'Development skills' },
  { id: 'responsibilities', label: 'Responsibilities', icon: CheckCircle, description: 'Acceptance responsibilities' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Completeness check' },
]

export default function ProductDescriptionForm({
  projectId,
  pdId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel,
  onHoldComplete
}) {
  const { theme } = useThemeContext()
  const [activeStep, setActiveStep] = useState(0)
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
    product_quality_tolerances: '',
    acceptance_method: '',
    acceptance_responsibilities: '',
    handover_arrangements: '',
    phased_handover: false,
    product_deliverable_id: null,
    ppd_composition_item_id: null,
    configuration_item_id: null,
    author_id: null,
    owner_id: null,
    client_id: null,
    status: 'draft'
  })
  const [compositionItems, setCompositionItems] = useState([])
  const [derivations, setDerivations] = useState([])
  const [acceptanceCriteria, setAcceptanceCriteria] = useState([])
  const [qualityExpectations, setQualityExpectations] = useState([])
  const [skills, setSkills] = useState([])
  const [responsibilities, setResponsibilities] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [completeness, setCompleteness] = useState(null)
  const [criteriaQuality, setCriteriaQuality] = useState(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(mode === 'create' && !pdId)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [accountId, setAccountId] = useState(null)

  useEffect(() => {
    if (pdId && mode !== 'create') {
      loadProductDescription()
    } else if (mode === 'create') {
      fetchAccountId()
    }
  }, [pdId, mode])

  const fetchAccountId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('account_id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single()
        
        if (userData?.account_id) {
          setAccountId(userData.account_id)
        }
      }
    } catch (error) {
      console.error('Error fetching account ID:', error)
    }
  }

  const handleTemplateSelect = async (template) => {
    if (!template || !projectId) return
    
    try {
      setLoading(true)
      const result = await createPDFromTemplate(projectId, template.id)
      
      if (result.success) {
        // Load the created PD
        if (result.data) {
          setFormData(result.data)
          setPdId(result.data.id)
          
          // Load child data
          const [compResult, derivResult, criteriaResult, qualityResult, skillsResult, respResult] = await Promise.all([
            getCompositionItems(result.data.id),
            getDerivations(result.data.id),
            getAcceptanceCriteria(result.data.id),
            getQualityExpectations(result.data.id),
            getSkills(result.data.id),
            getResponsibilities(result.data.id)
          ])
          
          if (compResult.success) setCompositionItems(compResult.data || [])
          if (derivResult.success) setDerivations(derivResult.data || [])
          if (criteriaResult.success) setAcceptanceCriteria(criteriaResult.data || [])
          if (qualityResult.success) setQualityExpectations(qualityResult.data || [])
          if (skillsResult.success) setSkills(skillsResult.data || [])
          if (respResult.success) setResponsibilities(respResult.data || [])
        }
        
        setShowTemplateSelector(false)
        setSelectedTemplate(template)
        alert('Product Description created from template successfully!')
      } else {
        alert('Error creating from template: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating from template:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pdId) {
      checkCompleteness()
      checkCriteriaQuality()
    }
  }, [pdId, formData, acceptanceCriteria])

  const loadProductDescription = async () => {
    try {
      setLoading(true)
      const result = await getProductDescriptionById(pdId)
      if (result.success) {
        setFormData(result.data)
        
        // Load child data
        const [compResult, derivResult, criteriaResult, qualityResult, skillsResult, respResult] = await Promise.all([
          getCompositionItems(pdId),
          getDerivations(pdId),
          getAcceptanceCriteria(pdId),
          getQualityExpectations(pdId),
          getSkills(pdId),
          getResponsibilities(pdId)
        ])
        
        if (compResult.success) setCompositionItems(compResult.data || [])
        if (derivResult.success) setDerivations(derivResult.data || [])
        if (criteriaResult.success) setAcceptanceCriteria(criteriaResult.data || [])
        if (qualityResult.success) setQualityExpectations(qualityResult.data || [])
        if (skillsResult.success) setSkills(skillsResult.data || [])
        if (respResult.success) setResponsibilities(respResult.data || [])
      }
    } catch (error) {
      console.error('Error loading product description:', error)
      alert('Error loading product description: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkCompleteness = async () => {
    if (!pdId) return
    try {
      const result = await validateCompleteness(pdId)
      if (result.success) {
        setCompleteness(result.data)
      }
    } catch (error) {
      console.error('Error checking completeness:', error)
    }
  }

  const checkCriteriaQuality = async () => {
    if (!pdId) return
    try {
      const result = await validateAcceptanceCriteriaQuality(pdId)
      if (result.success) {
        setCriteriaQuality(result.data)
      }
    } catch (error) {
      console.error('Error checking criteria quality:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleNext = () => {
    if (activeStep < FORM_STEPS.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const validateStep = () => {
    const step = FORM_STEPS[activeStep].id
    const newErrors = {}

    if (step === 'introduction') {
      if (!formData.product_title || formData.product_title.length < 3) {
        newErrors.product_title = 'Product title must be at least 3 characters'
      }
      if (!formData.purpose || formData.purpose.length < 50) {
        newErrors.purpose = 'Purpose must be at least 50 characters'
      }
    }

    if (step === 'acceptance') {
      if (acceptanceCriteria.length === 0) {
        newErrors.acceptance_criteria = 'At least one acceptance criterion is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateStep()) {
      return
    }

    try {
      setSaving(true)
      let result

      if (mode === 'create') {
        result = await createProductDescription(projectId, formData)
      } else {
        result = await updateProductDescription(pdId, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving product description: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving product description:', error)
      alert('Error saving product description: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    const step = FORM_STEPS[activeStep].id

    switch (step) {
      case 'introduction':
        return (
          <PDIntroductionSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'composition':
        return (
          <PDCompositionSection
            compositionItems={compositionItems}
            setCompositionItems={setCompositionItems}
            pdId={pdId}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'derivation':
        return (
          <PDDerivationsSection
            derivations={derivations}
            setDerivations={setDerivations}
            pdId={pdId}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'acceptance':
        return (
          <PDAcceptanceCriteriaSection
            acceptanceCriteria={acceptanceCriteria}
            setAcceptanceCriteria={setAcceptanceCriteria}
            pdId={pdId}
            mode={mode}
            criteriaQuality={criteriaQuality}
          />
        )
      case 'quality':
        return (
          <PDQualityExpectationsSection
            qualityExpectations={qualityExpectations}
            setQualityExpectations={setQualityExpectations}
            formData={formData}
            onChange={handleChange}
            pdId={pdId}
            mode={mode}
          />
        )
      case 'skills':
        return (
          <PDSkillsSection
            skills={skills}
            setSkills={setSkills}
            formData={formData}
            onChange={handleChange}
            pdId={pdId}
            mode={mode}
          />
        )
      case 'responsibilities':
        return (
          <PDAcceptanceResponsibilitiesSection
            responsibilities={responsibilities}
            setResponsibilities={setResponsibilities}
            formData={formData}
            onChange={handleChange}
            pdId={pdId}
            mode={mode}
            projectId={projectId}
            acceptanceCriteria={acceptanceCriteria}
          />
        )
      case 'review':
        return (
          <div className="space-y-6">
            <CompletenessIndicator completeness={completeness} />
            <AcceptanceCriteriaQualityChecker criteriaQuality={criteriaQuality} />
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Product Description Summary</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {formData.product_title || 'Not set'}</p>
                <p><strong>Purpose:</strong> {formData.purpose ? formData.purpose.substring(0, 100) + '...' : 'Not set'}</p>
                <p><strong>Composition Items:</strong> {compositionItems.length}</p>
                <p><strong>Derivations:</strong> {derivations.length}</p>
                <p><strong>Acceptance Criteria:</strong> {acceptanceCriteria.length}</p>
                <p><strong>Quality Expectations:</strong> {qualityExpectations.length}</p>
                <p><strong>Skills Required:</strong> {skills.length}</p>
                <p><strong>Acceptance Responsibilities:</strong> {responsibilities.length}</p>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product description...</p>
        </div>
      </div>
    )
  }

  // Show template selector if creating and no template selected yet
  if (showTemplateSelector && mode === 'create' && !pdId) {
    return (
      <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Product Description
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Start from a template or create from scratch
              </p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select a Template (Optional)
            </h2>
            <PDTemplateSelector
              onSelect={handleTemplateSelect}
              accountId={accountId}
            />
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowTemplateSelector(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Create from Scratch
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create Product Description' : mode === 'edit' ? 'Edit Product Description' : 'View Product Description'}
            </h1>
            {selectedTemplate && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Created from template: {selectedTemplate.template_name}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {FORM_STEPS[activeStep].description}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {mode !== 'view' && (
              <>
                <HoldButton
                  entityType="product_description"
                  entityId={pdId}
                  formData={formData}
                  projectId={projectId}
                  onHoldComplete={onHoldComplete || onCancel}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            {activeStep < FORM_STEPS.length - 1 && (
              <button
                onClick={() => {
                  if (validateStep()) {
                    handleNext()
                  }
                }}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
            {activeStep === FORM_STEPS.length - 1 && mode !== 'view' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
