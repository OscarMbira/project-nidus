/**
 * Platform Account Setup Onboarding
 * Multi-step wizard for setting up Platform account
 * 
 * IMPORTANT: Organisation/Account is created manually by the user via the organization setup form
 * after their first successful login. This wizard allows user to:
 * 1. Update account information (optional - if organisation already exists)
 * 2. Create first project (required)
 * 3. Assign Project Manager role to user in the project
 * 
 * If no organisation exists, user is redirected to /onboarding/organisation-setup
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { updateAccount, getUserAccounts } from '../../services/accountService'
import { assignProjectRole } from '../../services/roleService'
import { CheckCircle, Briefcase, Users, Settings, ArrowRight, ArrowLeft, Loader } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import MainHeader from '../../components/homepage/MainHeader'
import Footer from '../../components/homepage/Footer'

export default function PlatformAccountSetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(true)
  
  // Step 1: Account Details (optional - account already exists)
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('individual')
  const [companyName, setCompanyName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  
  // Step 2: First Project (required)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Step 3: Review & Confirm

  const steps = [
    { number: 1, title: 'Account Information', icon: Briefcase, optional: true },
    { number: 2, title: 'Create First Project', icon: Users },
    { number: 3, title: 'Review & Confirm', icon: CheckCircle },
  ]

  // Load existing account on mount
  useEffect(() => {
    loadAccount()
  }, [])

  const loadAccount = async () => {
    try {
      setLoadingAccount(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      // Get user's account
      const accountsResult = await getUserAccounts()
      if (accountsResult.success && accountsResult.data && accountsResult.data.length > 0) {
        const userAccount = accountsResult.data[0]
        setAccount(userAccount)

        // Clean values - convert "undefined" strings or null to empty strings
        const cleanValue = (val) => {
          if (val === 'undefined' || val === undefined || val === null) return ''
          return String(val)
        }

        setAccountName(cleanValue(userAccount.account_name))
        setAccountType(cleanValue(userAccount.account_type) || 'individual')
        setCompanyName(cleanValue(userAccount.company_name))
        setBillingEmail(cleanValue(userAccount.billing_email))
      }
    } catch (error) {
      console.error('Error loading account:', error)
      toast.error('Failed to load account information')
    } finally {
      setLoadingAccount(false)
    }
  }

  const handleNext = (e) => {
    // Prevent default form submission if any
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Validate step 2 before proceeding
    if (currentStep === 2) {
      if (!projectName.trim()) {
        toast.error('Project name is required')
        return
      }
    }
    
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
    if (!projectName.trim()) {
      toast.error('Project name is required')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Use atomic function to get or create user record
      let userData = null
      try {
        // Use atomic RPC function to get or create user
        // Note: get_user_accounts doesn't return owner_user_id, so we always use the RPC function
        console.log('Using atomic function to get/create user...')
        const { data: userResult, error: userRpcError } = await supabase.rpc('get_or_create_user', {
          p_auth_user_id: user.id,
          p_email: user.email || '',
          p_full_name: user.user_metadata?.full_name || null,
          p_first_name: user.user_metadata?.first_name || null,
          p_last_name: user.user_metadata?.last_name || null,
          p_is_verified: true
        })

        if (userRpcError) {
          console.error('Error from get_or_create_user:', userRpcError)
          throw new Error(`Failed to get/create user: ${userRpcError.message}`)
        }

        if (userResult && userResult.length > 0) {
          userData = {
            id: userResult[0].user_id,
            full_name: userResult[0].full_name_out,
            email: userResult[0].email_out
          }
          console.log('User record ready:', userData.id)
        } else {
          throw new Error('No user data returned from get_or_create_user function')
        }
      } catch (userError) {
        console.error('Exception getting/creating user:', userError)
        toast.error('Unable to retrieve your user record. Please refresh the page and try again.')
        setLoading(false)
        // Don't throw, just return to allow user to retry
        return
      }

      // Verify we have valid user data
      if (!userData || !userData.id) {
        console.error('User data is invalid or missing ID')
        console.error('User auth ID:', user.id)
        console.error('User email:', user.email)
        toast.error('Unable to retrieve your user record. Please refresh the page and try again.')
        setLoading(false)
        return
      }

      // Update account if information was changed
      if (account) {
        // Helper to get clean value (handle "undefined" strings from bad data)
        const cleanValue = (val) => {
          if (val === 'undefined' || val === undefined || val === null) return ''
          return val
        }

        // Check if any fields actually changed (compare with existing values)
        const existingAccountName = cleanValue(account.account_name)
        const existingAccountType = cleanValue(account.account_type) || 'individual'
        const existingCompanyName = cleanValue(account.company_name)
        const existingBillingEmail = cleanValue(account.billing_email)

        const hasChanges =
          (accountName && accountName !== existingAccountName) ||
          (accountType && accountType !== existingAccountType) ||
          (companyName && companyName !== existingCompanyName) ||
          (billingEmail && billingEmail !== existingBillingEmail)

        if (hasChanges) {
          // Get account ID - get_user_accounts returns account_id, not id
          const accountIdToUpdate = account.account_id || account.id
          
          // Validate account ID before updating
          if (!accountIdToUpdate || accountIdToUpdate === 'undefined' || accountIdToUpdate === 'null') {
            console.error('Cannot update account: invalid account ID', accountIdToUpdate)
            // Don't fail the whole process, just skip account update
          } else {
            const updateData = {}
            if (accountName && accountName !== existingAccountName) updateData.accountName = accountName
            if (accountType && accountType !== existingAccountType) updateData.accountType = accountType
            if (companyName && companyName !== existingCompanyName) updateData.companyName = companyName
            if (billingEmail && billingEmail !== existingBillingEmail) updateData.billingEmail = billingEmail

            const updateResult = await updateAccount(accountIdToUpdate, updateData)

            if (!updateResult.success) {
              console.error('Error updating account:', updateResult.error)
              // Don't fail if account update fails
            }
          }
        }
      }

      // Get account ID (use existing account or create one)
      // Note: get_user_accounts returns account_id, not id
      let accountId = account?.account_id || account?.id
      if (!accountId) {
        const accountsResult = await getUserAccounts()
        if (accountsResult.success && accountsResult.data && accountsResult.data.length > 0) {
          accountId = accountsResult.data[0].account_id || accountsResult.data[0].id
        } else {
          // No account/organisation exists - redirect to organization setup
          // Organisation must be created manually by the user via the organization setup form
          // This ensures proper organization details are provided and project_sponsor/executive role is assigned
          console.log('No account/organisation found - redirecting to organization setup')
          navigate('/onboarding/organisation-setup', { replace: true })
          return
        }
      }

      // Create first project
      const { data: projectStatus } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('status_name', 'Planning')
        .maybeSingle()

      // Generate unique project code
      const timestamp = Date.now().toString().slice(-8)
      const projectCode = `PROJ-${timestamp}`

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          account_id: accountId,
          project_code: projectCode,
          project_name: projectName,
          project_description: projectDescription || null,
          project_manager_user_id: userData.id,
          owner_user_id: userData.id, // Set owner as well
          planned_start_date: startDate || null,
          planned_end_date: endDate || null,
          status_id: projectStatus?.id || null,
        })
        .select()
        .maybeSingle()

      if (projectError) {
        console.error('Project creation error details:', projectError)
        throw new Error(`Failed to create project: ${projectError.message}`)
      }

      if (!newProject) {
        throw new Error('Project was not created. Please try again.')
      }

      // Assign Project Manager role to user in the project
      // We'll create the membership directly since we already have the internal user ID
      // This avoids RLS issues with looking up the user again
      try {
        // Get project manager role from project_roles (template)
        const { data: pmRole, error: roleError } = await supabase
          .from('project_roles')
          .select('id')
          .eq('role_name', 'project_manager')
          .eq('is_template', true)
          .eq('is_active', true)
          .maybeSingle()

        if (roleError) {
          console.error('Error fetching project manager role:', roleError)
        } else if (pmRole) {
          // Check if membership already exists
          const { data: existingMembership } = await supabase
            .from('project_memberships')
            .select('id')
            .eq('project_id', newProject.id)
            .eq('user_id', userData.id)
            .maybeSingle()

          if (existingMembership) {
            // Update existing membership
            const { error: updateError } = await supabase
              .from('project_memberships')
              .update({
                project_role_id: pmRole.id,
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingMembership.id)

            if (updateError) {
              console.error('Error updating project membership:', updateError)
            }
          } else {
            // Create new membership
            const { error: membershipError } = await supabase
              .from('project_memberships')
              .insert({
                project_id: newProject.id,
                user_id: userData.id,
                project_role_id: pmRole.id,
                invitation_status: 'accepted',
                accepted_at: new Date().toISOString(),
                is_active: true
              })

            if (membershipError) {
              console.error('Error creating project membership:', membershipError)
            }
          }
        }
      } catch (roleAssignError) {
        console.error('Error assigning project role:', roleAssignError)
        // Don't fail if role assignment fails, but log it
      }

      // Note: Platform subscription is automatically created when user registers
      // via the auto_create_free_subscription() trigger in the database.
      // No need to create it manually here.

      // Show success message
      toast.success('Account setup complete! Redirecting to dashboard...')

      // Small delay to show success message, then navigate
      setTimeout(() => {
        navigate('/platform/dashboard', { replace: true })
      }, 500)
    } catch (error) {
      console.error('Error completing setup:', error)
      toast.error(error.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {loadingAccount ? (
              <div className="text-center py-8">
                <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading account information...</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 Your account has already been created. You can update the information below or skip to create your first project.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
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
              </>
            )}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
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
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Your Setup</h3>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Account Information</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name: {accountName || account?.account_name || 'Not set'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Type: {accountType}</p>
              {billingEmail && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Billing Email: {billingEmail}</p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">First Project</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name: {projectName}</p>
              {projectDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Description: {projectDescription}</p>
              )}
              {startDate && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Start Date: {new Date(startDate).toLocaleDateString()}</p>
              )}
              {endDate && (
                <p className="text-sm text-gray-600 dark:text-gray-400">End Date: {new Date(endDate).toLocaleDateString()}</p>
              )}
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ You will be assigned as Project Manager for this project.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MainHeader />
      <div className="flex-grow py-12 px-4">
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
                  type="button"
                  onClick={handleNext}
                  disabled={loading || (currentStep === 2 && !projectName.trim())}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      <Footer />
    </div>
  )
}

