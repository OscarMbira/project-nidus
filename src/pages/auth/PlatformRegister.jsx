/**
 * Platform Registration Page
 * 
 * Dedicated registration page for Platform with Platform-specific styling
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { normalizeSupabaseAuthError } from '../../utils/authErrorMessage'
import { Mail, Lock, User, AlertCircle, Loader, UserPlus, Briefcase, CheckCircle2 } from 'lucide-react'
import { registerForPlatform, PLATFORMS } from '../../services/unifiedSubscriptionService'
import MainHeader from '../../components/homepage/MainHeader'
import PlatformFooter from '../../components/homepage/PlatformFooter'

export default function PlatformRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [invitationToken, setInvitationToken] = useState(null)

  useEffect(() => {
    // Check for invitation token in URL
    const invitation = searchParams.get('invitation')
    if (invitation) {
      setInvitationToken(invitation)
      // Try to fetch invitation details to pre-fill email
      fetchInvitationDetails(invitation)
    }
    
    // Check if user is already authenticated
    checkAuth()
  }, [searchParams])

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

  const fetchInvitationDetails = async (token) => {
    try {
      // Fetch invitation details to pre-fill email
      const { data, error } = await supabase
        .from('organisation_invitations')
        .select('invited_email, role_name, organisation_id')
        .eq('invitation_token', token)
        .eq('invitation_status', 'pending')
        .eq('is_deleted', false)
        .single()

      if (!error && data) {
        setEmail(data.invited_email)
      }
    } catch (err) {
      console.warn('Could not fetch invitation details:', err)
      // Continue without pre-filling
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
          emailRedirectTo: invitationToken 
            ? `${window.location.origin}/auth/confirm-email?invitation=${invitationToken}`
            : `${window.location.origin}/auth/confirm-email`,
          data: {
            full_name: fullName,
            selected_platforms: { platform: true, simulator: false },
            invitation_token: invitationToken || null, // Store invitation token for later use
          },
        },
      })

      if (authError) throw authError

      if (data.user) {
        // Platform registration will happen AFTER email confirmation
        // when the user has an authenticated session
        // We store the platform preference in user metadata for later use
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required - platform registration will happen after confirmation
          setSuccess(true)
        } else if (data.session) {
          // If instant login (no email confirmation), register for platform now
          try {
            await registerForPlatform(data.user.id, PLATFORMS.PLATFORM)
            console.log('Successfully registered for Platform')
          } catch (pmError) {
            console.error('Error registering for Platform:', pmError)
            // Continue anyway - can be registered later
          }
          navigate('/onboarding/platform-account-setup', { replace: true })
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
      {/* Header - Hide Platform button since user is registering for Platform */}
      <MainHeader hidePlatformButton={true} />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="p-3 bg-blue-600 rounded-full">
                <UserPlus className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your Platform account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Or{' '}
              <Link
                to="/platform/login"
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
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Selection - Auto-selected based on route */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Platform
                  </label>
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
                        <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Platform
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Real project management for your team
                        </p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You're registering for Platform. <Link to="/simulator/register" className="text-blue-600 hover:text-blue-500">Need Simulator instead?</Link>
                  </p>
                </div>

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
                      'Create Platform account'
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
                    to="/platform/login"
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
      <PlatformFooter />
    </div>
  )
}

