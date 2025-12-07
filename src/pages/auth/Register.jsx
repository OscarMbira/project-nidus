import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { Mail, Lock, User, AlertCircle, Loader, UserPlus, Briefcase, Gamepad2, CheckCircle2 } from 'lucide-react'
import { registerForPlatform, PLATFORMS } from '../../services/unifiedSubscriptionService'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    pm: true,
    simulator: false,
  })

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      // User not authenticated, stay on register page
    }
  }

  const handlePlatformToggle = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    // Check if at least one platform is selected
    if (!selectedPlatforms.pm && !selectedPlatforms.simulator) {
      setError('Please select at least one platform')
      return
    }

    setLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
          data: {
            full_name: fullName,
            selected_platforms: selectedPlatforms,
          },
        },
      })

      if (authError) throw authError

      if (data.user) {
        // Create user record in the users table with retry logic
        let userRecordCreated = false
        let retryCount = 0
        const maxRetries = 3
        
        while (!userRecordCreated && retryCount < maxRetries) {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', data.user.id)
            .maybeSingle()
          
          if (existingUser) {
            userRecordCreated = true
            console.log('User record already exists')
            break
          }
          
          const { error: userError } = await supabase
            .from('users')
            .insert([
              {
                auth_user_id: data.user.id,
                email: email,
                full_name: fullName,
                is_active: true,
                is_verified: false,
              },
            ])
            .select()
            .single()

          if (userError) {
            console.error(`Error creating user record (attempt ${retryCount + 1}):`, userError)
            // If it's a duplicate error, user might have been created
            if (userError.code === '23505' || userError.message?.includes('duplicate')) {
              userRecordCreated = true
              break
            }
            retryCount++
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
            }
          } else {
            userRecordCreated = true
            console.log('User record created successfully')
          }
        }
        
        if (!userRecordCreated) {
          console.error('Failed to create user record after retries')
          // Don't fail registration, but log the error
        }

        // Register user for selected platforms
        // This will trigger auto-creation of free subscriptions via database trigger
        try {
          if (selectedPlatforms.pm) {
            try {
              await registerForPlatform(data.user.id, PLATFORMS.PM)
              console.log('Successfully registered for PM platform')
            } catch (pmError) {
              console.error('Error registering for PM platform:', pmError)
              // Try again after a short delay
              setTimeout(async () => {
                try {
                  await registerForPlatform(data.user.id, PLATFORMS.PM)
                } catch (retryError) {
                  console.error('Retry failed for PM platform:', retryError)
                }
              }, 1000)
            }
          }
          if (selectedPlatforms.simulator) {
            try {
              await registerForPlatform(data.user.id, PLATFORMS.SIMULATOR)
              console.log('Successfully registered for Simulator platform')
            } catch (simError) {
              console.error('Error registering for Simulator platform:', simError)
              // Try again after a short delay
              setTimeout(async () => {
                try {
                  await registerForPlatform(data.user.id, PLATFORMS.SIMULATOR)
                } catch (retryError) {
                  console.error('Retry failed for Simulator platform:', retryError)
                }
              }, 1000)
            }
          }
        } catch (platformError) {
          console.error('Error registering platforms:', platformError)
          // Don't fail registration if platform registration fails
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setSuccess(true)
        } else if (data.session) {
          // Redirect to appropriate platform
          const redirectPath = selectedPlatforms.pm ? '/dashboard' : '/simulator'
          navigate(redirectPath, { replace: true })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError(error.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Email address is required to resend confirmation')
      return
    }

    setError(null)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
        },
      })

      if (resendError) {
        setError(resendError.message || 'Failed to resend confirmation email')
      } else {
        // Show success message
        setError(null)
        alert('Confirmation email has been resent. Please check your inbox.')
      }
    } catch (err) {
      console.error('Resend confirmation error:', err)
      setError(err.message || 'An error occurred while resending the confirmation email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8">
          {success ? (
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 border-2 border-blue-500">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Registration successful!
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>We've sent a confirmation email to <strong className="text-blue-600 dark:text-blue-400">{email}</strong>.</p>
                    <p className="mt-1">Please check your inbox and click the confirmation link to activate your account.</p>
                    <p className="mt-2 text-xs">
                      Didn't receive the email? Check your spam folder or{' '}
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        className="font-medium underline hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        resend confirmation email
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleRegister}>
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Which platforms would you like to use?
                </label>
                <div className="space-y-3">
                  {/* PM Platform Option */}
                  <div
                    onClick={() => handlePlatformToggle('pm')}
                    className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPlatforms.pm
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        selectedPlatforms.pm ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Briefcase className={`h-6 w-6 ${
                          selectedPlatforms.pm ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          PM Platform
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Real project management for your team
                        </p>
                      </div>
                    </div>
                    {selectedPlatforms.pm && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  {/* Simulator Option */}
                  <div
                    onClick={() => handlePlatformToggle('simulator')}
                    className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPlatforms.simulator
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        selectedPlatforms.simulator ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Gamepad2 className={`h-6 w-6 ${
                          selectedPlatforms.simulator ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          PM Simulator
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Practice PM skills in a risk-free environment
                        </p>
                      </div>
                    </div>
                    {selectedPlatforms.simulator && (
                      <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  You can select both platforms. Each has a free tier to get started.
                </p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <div className="mt-6">
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

