/**
 * Brief Wizard Component
 * Step-by-step wizard for creating project briefs
 */

import { useState } from 'react'
import { CheckCircle, Circle, ArrowRight, ArrowLeft } from 'lucide-react'

const WIZARD_STEPS = [
  { id: 'metadata', label: 'Metadata', description: 'Basic information and references' },
  { id: 'definition', label: 'Project Definition', description: 'Background, objectives, and scope' },
  { id: 'business-case', label: 'Business Case', description: 'Outline business case summary' },
  { id: 'products', label: 'Products', description: 'Product descriptions and quality' },
  { id: 'approach', label: 'Approach', description: 'Project approach and methodology' },
  { id: 'team', label: 'Team', description: 'Team structure and roles' },
  { id: 'review', label: 'Review', description: 'Lessons learned and references' },
]

export default function BriefWizard({ 
  formData, 
  onChange, 
  errors = {}, 
  onStepChange,
  currentStep: externalStep,
  readOnly = false 
}) {
  const [internalStep, setInternalStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  
  const currentStep = externalStep !== undefined ? externalStep : internalStep
  const totalSteps = WIZARD_STEPS.length

  const handleStepClick = (stepIndex) => {
    if (readOnly || stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      if (externalStep !== undefined && onStepChange) {
        onStepChange(stepIndex)
      } else {
        setInternalStep(stepIndex)
      }
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      
      if (externalStep !== undefined && onStepChange) {
        onStepChange(nextStep)
      } else {
        setInternalStep(nextStep)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      if (externalStep !== undefined && onStepChange) {
        onStepChange(prevStep)
      } else {
        setInternalStep(prevStep)
      }
    }
  }

  const isStepCompleted = (stepIndex) => {
    return completedSteps.has(stepIndex)
  }

  const isStepAccessible = (stepIndex) => {
    return stepIndex <= currentStep || completedSteps.has(stepIndex)
  }

  const getStepStatus = (stepIndex) => {
    if (stepIndex === currentStep) return 'current'
    if (completedSteps.has(stepIndex)) return 'completed'
    if (stepIndex < currentStep) return 'completed'
    return 'upcoming'
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Brief Creation Wizard
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            />
          </div>

          {WIZARD_STEPS.map((step, index) => {
            const status = getStepStatus(index)
            const isAccessible = isStepAccessible(index)

            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative z-10"
                style={{ flex: 1 }}
              >
                <button
                  onClick={() => handleStepClick(index)}
                  disabled={!isAccessible && !readOnly}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    status === 'current'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : isAccessible
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>
                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={`text-xs font-medium ${
                      status === 'current'
                        ? 'text-blue-600 dark:text-blue-400'
                        : status === 'completed'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      {!readOnly && (
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {WIZARD_STEPS[currentStep].label}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === totalSteps - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}

      {/* Step Content Placeholder */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Current Step:</strong> {WIZARD_STEPS[currentStep].label}
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          {WIZARD_STEPS[currentStep].description}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          Note: This wizard component provides step navigation. The actual form content should be rendered by the parent component based on the current step.
        </p>
      </div>
    </div>
  )
}
