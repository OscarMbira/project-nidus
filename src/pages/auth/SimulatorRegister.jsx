/**
 * Simulator Registration Page
 * 
 * Dedicated registration page for Simulator with Simulator-specific styling
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { normalizeSupabaseAuthError } from '../../utils/authErrorMessage'
import { Mail, Lock, User, AlertCircle, Loader, UserPlus, Gamepad2, CheckCircle2 } from 'lucide-react'
import { registerForPlatform, PLATFORMS } from '../../services/unifiedSubscriptionService'
import MainHeader from '../../components/homepage/MainHeader'
import SimulatorFooter from '../../components/homepage/SimulatorFooter'

export default function SimulatorRegister() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/simulator', { replace: true })
      }
    } catch (error) {
      // User not authenticated, stay on register page
    }
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

    setLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            selected_platforms: { platform: false, simulator: true },
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
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                is_active: true,
                is_verified: false,
              },
            ])
            .select()
            .single()

          if (userError) {
            console.error(`Error creating user record (attempt ${retryCount + 1}):`, userError)
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
        }

        // Register user for Simulator
        try {
          await registerForPlatform(data.user.id, PLATFORMS.SIMULATOR)
          console.log('Successfully registered for Simulator')
        } catch (simError) {
          console.error('Error registering for Simulator:', simError)
          setTimeout(async () => {
            try {
              await registerForPlatform(data.user.id, PLATFORMS.SIMULATOR)
            } catch (retryError) {
              console.error('Retry failed for Simulator:', retryError)
            }
          }, 1000)
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setSuccess(true)
        } else if (data.session) {
          navigate('/simulator', { replace: true })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError(
        normalizeSupabaseAuthError(error, 'An error occurred during registration.')
      )
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
        setError(
          normalizeSupabaseAuthError(resendError, 'Failed to resend confirmation email.')
        )
      } else {
        setError(null)
        alert('Confirmation email has been resent. Please check your inbox.')
      }
    } catch (err) {
      console.error('Resend confirmation error:', err)
      setError(
        normalizeSupabaseAuthError(
          err,
          'An error occurred while resending the confirmation email.'
        )
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header - Hide Simulator button since user is registering for Simulator */}
      <MainHeader hideSimulatorButton={true} />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="p-3 bg-green-600 rounded-full">
                <UserPlus className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your Simulator account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Or{' '}
              <Link
                to="/simulator/login"
                className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
              >
                sign in to your existing account
              </Link>
            </p>
          </div>

          <div className="mt-8">
            {success ? (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border-2 border-green-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      Registration successful!
                    </h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      <p>We've sent a confirmation email to <strong className="text-green-600 dark:text-green-400">{email}</strong>.</p>
                      <p className="mt-1">Please check your inbox and click the confirmation link to activate your account.</p>
                      <p className="mt-2 text-xs">
                        Didn't receive the email? Check your spam folder or{' '}
                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          className="font-medium underline hover:text-green-900 dark:hover:text-green-100"
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
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulator Selection - Auto-selected based on route */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Platform
                  </label>
                  <div className="p-4 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-800">
                        <Gamepad2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Simulator
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Practice PM skills in a risk-free environment
                        </p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You're registering for Simulator. <Link to="/platform/register" className="text-green-600 hover:text-green-500">Need Platform instead?</Link>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        First Name
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Name
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
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
                        className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
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
                        className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
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
                        className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin mr-2" />
                        Creating account...
                      </>
                    ) : (
                      'Create Simulator account'
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
                    to="/simulator/login"
                    className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SimulatorFooter />
    </div>
  )
}

