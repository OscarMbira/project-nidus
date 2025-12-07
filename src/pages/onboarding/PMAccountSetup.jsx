/**
 * PM Account Setup Onboarding
 * Multi-step wizard for setting up PM Platform account
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { createAccount } from '../../services/accountService'
import { CheckCircle, Briefcase, Users, Settings, ArrowRight, ArrowLeft, Loader } from 'lucide-react'
import { useToast } from '../../hooks/useToast'

export default function PMAccountSetup() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Step 1: Account Details
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('individual')
  const [companyName, setCompanyName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  
  // Step 2: First Project
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  
  // Step 3: Default Roles (optional - skip for now)
  
  // Step 4: Team Invitation (optional - skip for now)

  const steps = [
    { number: 1, title: 'Account Details', icon: Briefcase },
    { number: 2, title: 'First Project', icon: Users },
    { number: 3, title: 'Customize Roles', icon: Settings, optional: true },
    { number: 4, title: 'Invite Team', icon: Users, optional: true },
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get internal user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError) throw userError

      // Create account
      const accountResult = await createAccount(userData.id, {
        accountName: accountName || `${userData.full_name || 'My'} Account`,
        accountType,
        companyName: companyName || null,
        billingEmail: billingEmail || user.email,
      })

      if (!accountResult.success) {
        throw new Error(accountResult.error)
      }

      // Create first project if provided
      if (projectName) {
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            account_id: accountResult.data.id,
            project_name: projectName,
            project_description: projectDescription || null,
            project_manager_user_id: userData.id,
            status_id: (await supabase.from('project_statuses').select('id').eq('status_name', 'Planning').single()).data?.id,
          })

        if (projectError) {
          console.error('Error creating project:', projectError)
          // Don't fail onboarding if project creation fails
        }
      }

      showToast('success', 'Account setup complete!')
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      console.error('Error completing setup:', error)
      showToast('error', error.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="My Company"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Type *
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="enterprise">Enterprise</option>
                <option value="educational">Educational</option>
                <option value="non_profit">Non-Profit</option>
              </select>
            </div>

            {accountType !== 'individual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Company Name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Email
              </label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="billing@example.com"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="My First Project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Description
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your project..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 You can create more projects later from the Projects page.
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Role customization can be done later from the Project Settings.
            </p>
            <button
              onClick={handleSkip}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Skip for now →
            </button>
          </div>
        )

      case 4:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You can invite team members later from the Project Users page.
            </p>
            <button
              onClick={handleSkip}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Skip for now →
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={`text-xs font-medium ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.optional && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">(Optional)</p>
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {steps[currentStep - 1].title}
          </h2>

          {renderStepContent()}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>

            <div className="flex space-x-3">
              {steps[currentStep - 1].optional && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:underline"
                >
                  Skip
                </button>
              )}
              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  disabled={loading || (currentStep === 1 && !accountName)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

