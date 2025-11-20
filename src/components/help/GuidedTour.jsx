import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { getGuidedTour, completeGuidedTour, hasUserCompletedTour } from '../../services/helpService'
import { supabase } from '../../services/supabaseClient'

export default function GuidedTour({ tourKey, onComplete, onSkip, autoStart = false }) {
  const [tour, setTour] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [userId, setUserId] = useState(null)
  const tourRef = useRef(null)

  useEffect(() => {
    loadTour()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [tourKey])

  useEffect(() => {
    if (autoStart && tour && userId) {
      checkTourCompletion()
    }
  }, [autoStart, tour, userId])

  const loadTour = async () => {
    try {
      const result = await getGuidedTour(tourKey)
      if (result.success && result.data) {
        setTour(result.data)
        if (autoStart) {
          setIsVisible(true)
        }
      }
    } catch (error) {
      console.error('Error loading guided tour:', error)
    }
  }

  const checkTourCompletion = async () => {
    if (!tour || !userId) return

    try {
      const result = await hasUserCompletedTour(userId, tour.id)
      if (result.success && result.completed) {
        setCompleted(true)
        setIsVisible(false)
      } else if (tour.trigger_type === 'automatic' || tour.trigger_type === 'on_first_visit') {
        setIsVisible(true)
      }
    } catch (error) {
      console.error('Error checking tour completion:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(currentStep + 1)
      scrollToStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      scrollToStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (tour && userId) {
      try {
        await completeGuidedTour(userId, tour.id, currentStep + 1, false, 0)
        setCompleted(true)
        setIsVisible(false)
        if (onComplete) onComplete(tour)
      } catch (error) {
        console.error('Error completing tour:', error)
      }
    }
  }

  const handleSkip = async () => {
    if (tour && userId) {
      try {
        await completeGuidedTour(userId, tour.id, currentStep, true, 0)
        setCompleted(true)
        setIsVisible(false)
        if (onSkip) onSkip(tour)
      } catch (error) {
        console.error('Error skipping tour:', error)
      }
    } else {
      setIsVisible(false)
      if (onSkip) onSkip(tour)
    }
  }

  const scrollToStep = (stepIndex) => {
    if (!tour || !tour.steps[stepIndex]) return

    const step = tour.steps[stepIndex]
    if (step.selector) {
      const element = document.querySelector(step.selector)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const startTour = () => {
    setIsVisible(true)
    if (tour && tour.steps.length > 0) {
      setCurrentStep(0)
      scrollToStep(0)
    }
  }

  if (!tour || completed || !isVisible) {
    if (!completed && tour && autoStart) {
      return (
        <button
          onClick={startTour}
          className="fixed bottom-24 right-6 z-40 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          Start Tour
        </button>
      )
    }
    return null
  }

  const step = tour.steps[currentStep]
  if (!step) return null

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (step.selector) {
      const element = document.querySelector(step.selector)
      if (element) {
        const rect = element.getBoundingClientRect()
        const position = step.position || 'bottom'

        switch (position) {
          case 'top':
            return {
              bottom: `${window.innerHeight - rect.top}px`,
              left: `${rect.left + rect.width / 2}px`,
              transform: 'translate(-50%, 0)'
            }
          case 'left':
            return {
              top: `${rect.top + rect.height / 2}px`,
              right: `${window.innerWidth - rect.left}px`,
              transform: 'translate(0, -50%)'
            }
          case 'right':
            return {
              top: `${rect.top + rect.height / 2}px`,
              left: `${rect.right}px`,
              transform: 'translate(0, -50%)'
            }
          default: // bottom
            return {
              top: `${rect.bottom}px`,
              left: `${rect.left + rect.width / 2}px`,
              transform: 'translate(-50%, 0)'
            }
        }
      }
    }

    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleSkip} />

      {/* Highlight */}
      {step.selector && (
        <div
          className="fixed border-4 border-blue-500 rounded-lg z-50 pointer-events-none"
          style={{
            top: (() => {
              const element = document.querySelector(step.selector)
              return element ? `${element.getBoundingClientRect().top - 4}px` : 0
            })(),
            left: (() => {
              const element = document.querySelector(step.selector)
              return element ? `${element.getBoundingClientRect().left - 4}px` : 0
            })(),
            width: (() => {
              const element = document.querySelector(step.selector)
              return element ? `${element.getBoundingClientRect().width + 8}px` : 0
            })(),
            height: (() => {
              const element = document.querySelector(step.selector)
              return element ? `${element.getBoundingClientRect().height + 8}px` : 0
            })()
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4"
        style={getTooltipStyle()}
        ref={tourRef}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Step {currentStep + 1} of {tour.steps.length}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step.title}
            </h3>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Close tour"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {step.content && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {step.content}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tour.steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="h-4 w-4 inline mr-1" />
                Previous
              </button>
            )}
            {currentStep < tour.steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
                <ChevronRight className="h-4 w-4 inline ml-1" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Check className="h-4 w-4 inline mr-1" />
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

