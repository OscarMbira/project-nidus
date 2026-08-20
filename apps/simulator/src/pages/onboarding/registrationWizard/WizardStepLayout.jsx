/**
 * Shared shell for registration wizard steps 2-6 (v918, CLAUDE.md Phase 5): header, progress
 * indicator, and themed card. Extracted so each step page only owns its own form fields.
 */
import React, { Suspense, lazy } from 'react'
import { REGISTRATION_WIZARD_STEPS } from './registrationWizardSteps'

const PlatformHeader = lazy(() => import('../../../components/homepage/PlatformHeader'))

export default function WizardStepLayout({ stepId, icon: Icon, title, subtitle, children }) {
  const currentIndex = REGISTRATION_WIZARD_STEPS.findIndex((s) => s.id === stepId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<div className="h-16 bg-gray-100 dark:bg-gray-800" />}>
        <PlatformHeader />
      </Suspense>

      <div className="flex items-center justify-center p-4 py-8">
        <div className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Progress indicator */}
          <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 mb-8">
            {REGISTRATION_WIZARD_STEPS.map((step, index) => {
              const isComplete = index < currentIndex
              const isCurrent = index === currentIndex
              return (
                <li key={step.id} className="flex items-center gap-2">
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold flex-shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isComplete
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-xs sm:text-sm whitespace-nowrap ${
                      isCurrent
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < REGISTRATION_WIZARD_STEPS.length - 1 && (
                    <span className="w-4 sm:w-8 h-px bg-gray-200 dark:bg-gray-700" />
                  )}
                </li>
              )
            })}
          </ol>

          <div className="text-center mb-8">
            {Icon && (
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
            {subtitle && <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
