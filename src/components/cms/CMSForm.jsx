/**
 * CMS Form Component
 * Main form for creating/editing Communication Management Strategy
 * Wizard format with sections
 */

import { useState } from 'react'
import { CheckCircle, FileText, MessageSquare, Users, Settings, Calendar, BarChart3, Shield, Megaphone } from 'lucide-react'
import { HoldButton } from '../ui/HoldButton'

export default function CMSForm({
  cmsData = {},
  cmsId = null,
  onChange,
  errors = {},
  onSave,
  onCancel,
  onHoldComplete,
  saving = false
}) {
  const [activeStep, setActiveStep] = useState(1)

  const steps = [
    { id: 1, label: 'Introduction', icon: FileText },
    { id: 2, label: 'Channels', icon: Megaphone },
    { id: 3, label: 'Methods', icon: MessageSquare },
    { id: 4, label: 'Audiences', icon: Users },
    { id: 5, label: 'Procedures', icon: Settings },
    { id: 6, label: 'Standards & Tools', icon: Shield },
    { id: 7, label: 'Records & Reports', icon: FileText },
    { id: 8, label: 'Activities', icon: Calendar },
    { id: 9, label: 'Roles', icon: Users },
    { id: 10, label: 'Review', icon: CheckCircle }
  ]

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...cmsData, [field]: value })
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 1: // Introduction
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.purpose || ''}
                onChange={(e) => handleChange('purpose', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the purpose of this communication management strategy..."
              />
              {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Objectives <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.objectives || ''}
                onChange={(e) => handleChange('objectives', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Define the communication objectives for this project..."
              />
              {errors.objectives && <p className="text-red-500 text-sm mt-1">{errors.objectives}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scope <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.scope || ''}
                onChange={(e) => handleChange('scope', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Define the scope of communication management..."
              />
              {errors.scope && <p className="text-red-500 text-sm mt-1">{errors.scope}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Strategy Responsibility
              </label>
              <textarea
                value={cmsData.strategy_responsibility || ''}
                onChange={(e) => handleChange('strategy_responsibility', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Who is responsible for this strategy?"
              />
            </div>
          </div>
        )

      case 5: // Procedures
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Communication Planning Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.communication_planning_approach || ''}
                onChange={(e) => handleChange('communication_planning_approach', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe how communication planning will be conducted..."
              />
              {errors.communication_planning_approach && <p className="text-red-500 text-sm mt-1">{errors.communication_planning_approach}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Communication Control Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.communication_control_approach || ''}
                onChange={(e) => handleChange('communication_control_approach', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe how communication control will be managed..."
              />
              {errors.communication_control_approach && <p className="text-red-500 text-sm mt-1">{errors.communication_control_approach}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Communication Assurance Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cmsData.communication_assurance_approach || ''}
                onChange={(e) => handleChange('communication_assurance_approach', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe how communication assurance will be conducted..."
              />
              {errors.communication_assurance_approach && <p className="text-red-500 text-sm mt-1">{errors.communication_assurance_approach}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Corporate Communication Policy Reference
              </label>
              <input
                type="text"
                value={cmsData.corporate_communication_policy_reference || ''}
                onChange={(e) => handleChange('corporate_communication_policy_reference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Reference to corporate communication policy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variance from Corporate Standards (if any)
              </label>
              <textarea
                value={cmsData.variance_from_corporate || ''}
                onChange={(e) => handleChange('variance_from_corporate', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Any variances from corporate standards..."
              />
            </div>

            {cmsData.variance_from_corporate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Variance Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cmsData.variance_justification || ''}
                  onChange={(e) => handleChange('variance_justification', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Justify why this variance is necessary..."
                />
              </div>
            )}
          </div>
        )

      case 2:
      case 3:
      case 4:
      case 6:
      case 7:
      case 8:
      case 9:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {steps[activeStep - 1].label} section will be implemented in Phase 5-7 components.
              <br />
              For now, these can be managed via the CMS view after creation.
            </p>
          </div>
        )

      case 10: // Review
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Review all sections and save when ready. Additional sections (Channels, Methods, Audiences, etc.) can be added after creating the CMS.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Purpose:</strong> {cmsData.purpose ? '✓ Provided' : '✗ Missing'}</p>
                <p><strong>Objectives:</strong> {cmsData.objectives ? '✓ Provided' : '✗ Missing'}</p>
                <p><strong>Scope:</strong> {cmsData.scope ? '✓ Provided' : '✗ Missing'}</p>
                <p><strong>Planning Approach:</strong> {cmsData.communication_planning_approach ? '✓ Provided' : '✗ Missing'}</p>
                <p><strong>Control Approach:</strong> {cmsData.communication_control_approach ? '✓ Provided' : '✗ Missing'}</p>
                <p><strong>Assurance Approach:</strong> {cmsData.communication_assurance_approach ? '✓ Provided' : '✗ Missing'}</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canGoNext = () => {
    if (activeStep === 10) return false
    if (activeStep === 1) {
      return cmsData.purpose && cmsData.objectives && cmsData.scope
    }
    if (activeStep === 5) {
      return cmsData.communication_planning_approach && 
             cmsData.communication_control_approach && 
             cmsData.communication_assurance_approach
    }
    return true
  }

  const handleNext = () => {
    if (canGoNext() && activeStep < 10) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {steps[activeStep - 1].label}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {activeStep} of {steps.length}
          </span>
        </div>
        
        {/* Step Indicators */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === activeStep
            const isCompleted = step.id < activeStep
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : isCompleted
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{step.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {renderStepContent()}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          )}
          <HoldButton
            entityType="cms"
            entityId={cmsId}
            formData={cmsData}
            onHoldComplete={onHoldComplete || onCancel}
          />
        </div>
        <div className="flex items-center gap-3">
          {activeStep > 1 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Previous
            </button>
          )}
          {activeStep < 10 ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save CMS'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
