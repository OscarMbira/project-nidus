import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { Mail, CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Button from '../../components/ui/Button'
// Note: createAccount and assignSystemRole imports removed
// Organisation/Company creation is done manually via organization setup form
// Role assignment (project_sponsor/executive) happens during organization creation
import { hasRegisteredForPlatform, registerForPlatform } from '../../services/unifiedSubscriptionService'
import { acceptOrganisationInvitation } from '../../services/organisationRoleService'

export default function EmailConfirmation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error', 'expired'
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState('')
  const [continueLoading, setContinueLoading] = useState(false)
  const errorCheckedRef = useRef(false)

  const checkUserVerificationStatus = useCallback(async (emailAddress) => {
    try {
      // Check if user exists and is verified in our database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_verified, auth_user_id')
        .eq('email', emailAddress)
        .eq('is_deleted', false)
        .single()

      if (userError || !userData) {
        return false
      }

      // If user is verified in our DB, check Supabase auth status
      if (userData.is_verified && userData.auth_user_id) {
        try {
          // Try to get user from Supabase auth (admin function)
          // Note: This requires RLS to allow reading auth.users or we use a different approach
          const { data: { user } } = await supabase.auth.getUser()
          
          // If we have a session, check if email is confirmed
          if (user && user.email === emailAddress) {
            return user.email_confirmed_at !== null || user.confirmed_at !== null
          }

          // If no session but user is verified in DB, assume they're verified
          return userData.is_verified
        } catch (authError) {
          // If we can't check auth, trust the DB status
          return userData.is_verified
        }
      }

      return false
    } catch (err) {
      console.error('Error checking user verification status:', err)
      return false
    }
  }, [])

  const checkForErrors = useCallback(async () => {
    // Only check once
    if (errorCheckedRef.current) {
      return status === 'error' || status === 'expired'
    }
    errorCheckedRef.current = true

    // Check URL hash for error parameters (Supabase uses hash fragments for errors)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)) // Remove # and parse
      const error = params.get('error')
      const errorCode = params.get('error_code')
      const errorDescription = params.get('error_description')
      const emailParam = params.get('email')

      if (error || errorCode) {
        // Extract email if available
        if (emailParam) {
          setEmail(emailParam)
        }

        // Check if user is already verified before showing error
        if (emailParam) {
          const isVerified = await checkUserVerificationStatus(emailParam)
          if (isVerified) {
            // User is already verified, show success instead of error
            setStatus('success')
            setError(null)
            setLoading(false)
            return true
          }
        }

        setLoading(false)
        
        // Handle specific error codes
        if (errorCode === 'otp_expired' || error?.includes('expired') || errorDescription?.includes('expired')) {
          setStatus('expired')
          setError('This confirmation link has expired. Please request a new one.')
        } else if (errorCode === 'access_denied' || error === 'access_denied') {
          setStatus('expired')
          setError('Invalid confirmation link. Please check your email and try again.')
        } else {
          setStatus('error')
          setError(errorDescription || error || 'Email verification failed. Please try again.')
        }
        return true // Indicates error was found
      }
    }
    return false
  }, [status, checkUserVerificationStatus])

  useEffect(() => {
    // Check for error parameters in URL hash first (Supabase redirects errors in hash)
    let isMounted = true
    
    const handleInitialCheck = async () => {
      const hasError = await checkForErrors()
      // Only proceed with session check if no error was found and component is still mounted
      if (!hasError && isMounted) {
        await checkSession()
      }
    }
    
    handleInitialCheck()
    
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const checkSession = useCallback(async () => {
    try {
      // Check if user is already authenticated (Supabase may have auto-confirmed)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && session.user) {
        // Create or update user record using atomic function
        try {
          // Use atomic function to get or create user
          const { data: userRecord, error: userError } = await supabase.rpc('get_or_create_user', {
            p_auth_user_id: session.user.id,
            p_email: session.user.email || '',
            p_full_name: session.user.user_metadata?.full_name || null,
            p_is_verified: true
          })

          if (userError) {
            console.error('Error getting/creating user record:', userError)
            // Continue anyway - account creation can happen in Platform Account Setup
          } else if (userRecord && userRecord.length > 0) {
            const userData = userRecord[0]
            console.log('User record ready:', userData.user_id)

            // Check for invitation token (from URL or user metadata)
            const invitationToken = searchParams.get('invitation') || 
                                   session.user.user_metadata?.invitation_token ||
                                   null

            if (invitationToken) {
              // User signed up via invitation - accept invitation and assign role
              try {
                const inviteResult = await acceptOrganisationInvitation(
                  invitationToken,
                  session.user.id
                )
                if (inviteResult.success) {
                  console.log('Organisation invitation accepted and role assigned')
                  // Don't create default account - user is part of invited organisation
                  setStatus('success')
                  setEmail(session.user.email || '')
                  setLoading(false)
                  return
                } else {
                  console.warn('Failed to accept invitation:', inviteResult.error)
                  // Continue with normal flow
                }
              } catch (inviteError) {
                console.error('Error accepting invitation:', inviteError)
                // Continue with normal flow
              }
            }

            // Note: Organisation/Company creation is NOT done here
            // Users must manually complete the organization setup form
            // This ensures they provide proper organization details (company name, address, etc.)
            // The organization setup form will create the account and assign project_sponsor/executive role
            // Check if user registered for Platform (for logging purposes only)
            const registeredForPlatform = await hasRegisteredForPlatform(session.user.id, 'platform')
            if (registeredForPlatform) {
              console.log('User registered for Platform - will be redirected to organization setup on login')
            }
          }
        } catch (accountError) {
          console.error('Error in post-verification setup:', accountError)
          // Don't fail email verification if account creation fails
          // Account will be created later in PlatformAccountSetup
        }

        setStatus('success')
        setEmail(session.user.email || '')
        setLoading(false)
        return
      }

      // No session found, try to verify with URL parameters
      verifyEmail()
    } catch (err) {
      console.error('Session check error:', err)
      verifyEmail()
    }
  }, [searchParams])

  const verifyEmail = useCallback(async () => {
    try {
      // Check URL hash for parameters (Supabase may put params in hash)
      const hash = window.location.hash
      let hashParams = null
      if (hash) {
        hashParams = new URLSearchParams(hash.substring(1))
        // If hash contains error, we've already handled it in checkForErrors
        if (hashParams.get('error') || hashParams.get('error_code')) {
          return
        }
      }

      // Get parameters from both query string and hash
      const token = searchParams.get('token') || hashParams?.get('token')
      const tokenHash = searchParams.get('token_hash') || hashParams?.get('token_hash')
      const type = searchParams.get('type') || hashParams?.get('type') || 'signup'
      const emailParam = searchParams.get('email') || hashParams?.get('email')

      if (emailParam) {
        setEmail(emailParam)
      }

      // Supabase email confirmation can come in different formats
      // Check for token_hash (newer format) or token (older format)
      if (!token && !tokenHash) {
        setStatus('error')
        setError('Invalid confirmation link. Please check your email and try again.')
        setLoading(false)
        return
      }

      let verifyData = null
      let verifyError = null

      // Try to verify with token_hash first (newer Supabase format)
      if (tokenHash) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type || 'signup'
        })
        verifyData = result.data
        verifyError = result.error
      } 
      // Fallback to token (older format or direct URL)
      else if (token) {
        const result = await supabase.auth.verifyOtp({
          token: token,
          type: type || 'signup'
        })
        verifyData = result.data
        verifyError = result.error
      }

      if (verifyError) {
        // Check if token is expired
        const errorMessage = verifyError.message || ''
        const errorCode = verifyError.code || ''
        
        if (
          errorMessage.includes('expired') || 
          errorMessage.includes('expired_token') ||
          errorCode === 'otp_expired' ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('expired')
        ) {
          setStatus('expired')
          setError('This confirmation link has expired. Please request a new one.')
        } else if (errorMessage.includes('access_denied') || errorCode === 'access_denied') {
          setStatus('expired')
          setError('Invalid confirmation link. Please check your email and try again.')
        } else {
          setStatus('error')
          setError(verifyError.message || 'Failed to verify email. Please try again.')
        }
        setLoading(false)
        return
      }

      if (verifyData?.user) {
        // Create or update user record using atomic function
        try {
          // Use atomic function to get or create user
          const { data: userRecord, error: userError } = await supabase.rpc('get_or_create_user', {
            p_auth_user_id: verifyData.user.id,
            p_email: verifyData.user.email || emailParam || '',
            p_full_name: verifyData.user.user_metadata?.full_name || null,
            p_is_verified: true
          })

          if (userError) {
            console.error('Error getting/creating user record:', userError)
            // Continue anyway - account creation can happen in Platform Account Setup
          } else if (userRecord && userRecord.length > 0) {
            const userData = userRecord[0]
            console.log('User record ready:', userData.user_id)

            // Check for invitation token (from URL or user metadata)
            const invitationToken = searchParams.get('invitation') || 
                                   verifyData.user.user_metadata?.invitation_token ||
                                   null

            if (invitationToken) {
              // User signed up via invitation - accept invitation and assign role
              try {
                const inviteResult = await acceptOrganisationInvitation(
                  invitationToken,
                  verifyData.user.id
                )
                if (inviteResult.success) {
                  console.log('Organisation invitation accepted and role assigned')
                  // Don't create default account - user is part of invited organisation
                  setStatus('success')
                  setEmail(verifyData.user.email || emailParam || '')
                  setLoading(false)
                  return
                } else {
                  console.warn('Failed to accept invitation:', inviteResult.error)
                  // Continue with normal flow
                }
              } catch (inviteError) {
                console.error('Error accepting invitation:', inviteError)
                // Continue with normal flow
              }
            }

            // Note: Account/Organization creation is NOT done here
            // Users must manually complete the organization setup form
            // This ensures they provide proper organization details
            // The organization setup form will assign the project_sponsor/executive role
            
            // Register user for platform if they selected it during signup
            // Check user metadata for platform selection
            const selectedPlatforms = verifyData.user.user_metadata?.selected_platforms
            if (selectedPlatforms) {
              if (selectedPlatforms.platform === true) {
                try {
                  await registerForPlatform(verifyData.user.id, 'platform')
                  console.log('Successfully registered for Platform after email confirmation')
                } catch (platformError) {
                  console.error('Error registering for Platform after email confirmation:', platformError)
                  // Continue anyway - can be registered later
                }
              }
              if (selectedPlatforms.simulator === true) {
                try {
                  await registerForPlatform(verifyData.user.id, 'simulator')
                  console.log('Successfully registered for Simulator after email confirmation')
                } catch (simError) {
                  console.error('Error registering for Simulator after email confirmation:', simError)
                  // Continue anyway - can be registered later
                }
              }
            }
          }
        } catch (accountError) {
          console.error('Error in post-verification setup:', accountError)
          // Don't fail email verification if account creation fails
          // Account will be created later in PlatformAccountSetup
        }

        setStatus('success')
        setEmail(verifyData.user.email || emailParam || '')
      } else {
        setStatus('error')
        setError('Unable to verify email. Please try again or request a new confirmation link.')
      }
    } catch (err) {
      console.error('Email verification error:', err)
      setStatus('error')
      setError(err.message || 'An error occurred during email verification')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  const handleResendConfirmation = useCallback(async () => {
    if (!email) {
      setError('Email address is required to resend confirmation')
      return
    }

    setResending(true)
    setError(null)

    try {
      // First check if user is already verified
      const isVerified = await checkUserVerificationStatus(email)
      if (isVerified) {
        setStatus('success')
        setError(null)
        setResending(false)
        return
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`
        }
      })

      if (resendError) {
        // Check if error is because user is already verified
        if (resendError.message?.includes('already') || resendError.message?.includes('verified')) {
          setStatus('success')
          setError(null)
        } else {
          setError(resendError.message || 'Failed to resend confirmation email')
        }
      } else {
        setStatus('verifying')
        setError(null)
        // Use toast instead of DOM manipulation
        toast.success('Confirmation email has been resent. Please check your inbox.')
      }
    } catch (err) {
      console.error('Resend confirmation error:', err)
      setError(err.message || 'An error occurred while resending the confirmation email')
    } finally {
      setResending(false)
    }
  }, [email, checkUserVerificationStatus])

  const handleContinueSetup = useCallback(async () => {
    setContinueLoading(true)
    try {
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User not authenticated:', userError)
        // Sign out and redirect to login
        const selectedPlatforms = user?.user_metadata?.selected_platforms || {}
        const loginRoute = selectedPlatforms.simulator && !selectedPlatforms.platform
          ? '/simulator/login'
          : '/platform/login'
        await supabase.auth.signOut()
        navigate(loginRoute, { replace: true, state: { message: 'Please log in to continue.', fromEmailConfirmation: true } })
        return
      }

      // Step 1: Ensure user record exists using atomic function
      try {
        const { data: userResult, error: userRpcError } = await supabase.rpc('get_or_create_user', {
          p_auth_user_id: user.id,
          p_email: user.email || '',
          p_full_name: user.user_metadata?.full_name || null,
          p_is_verified: true
        })

        if (userRpcError) {
          console.error('Error getting/creating user:', userRpcError)
        }
      } catch (userError) {
        console.error('Exception getting/creating user:', userError)
      }

      // Step 2: Check platform registration from metadata first (faster)
      const selectedPlatforms = user.user_metadata?.selected_platforms || {}
      const registeredForPlatform = selectedPlatforms.platform === true
      const registeredForSimulator = selectedPlatforms.simulator === true

      // Step 3: If metadata not available, check database
      let hasPlatform = registeredForPlatform
      let hasSimulator = registeredForSimulator

      if (!hasPlatform && !hasSimulator) {
        // Check database for platform access
        try {
          hasPlatform = await hasRegisteredForPlatform(user.id, 'platform')
          hasSimulator = await hasRegisteredForPlatform(user.id, 'simulator')
        } catch (platformError) {
          console.error('Error checking platform access:', platformError)
        }

        // If still no platform access found, try to create from metadata
        if (!hasPlatform && registeredForPlatform) {
          try {
            await registerForPlatform(user.id, 'platform')
            hasPlatform = true
          } catch (regError) {
            console.error('Error registering for platform:', regError)
          }
        }

        if (!hasSimulator && registeredForSimulator) {
          try {
            await registerForPlatform(user.id, 'simulator')
            hasSimulator = true
          } catch (regError) {
            console.error('Error registering for simulator:', regError)
          }
        }
      }
      
      // Step 4: Sign out user and redirect to appropriate login page
      console.log('Email confirmed. Signing out and redirecting to login.')
      await supabase.auth.signOut()
      
      // Determine which login page to redirect to based on platform registration
      const loginRoute = hasSimulator && !hasPlatform 
        ? '/simulator/login' 
        : '/platform/login'
      
      navigate(loginRoute, { replace: true, state: { message: 'Email confirmed successfully! Please log in to continue.', fromEmailConfirmation: true } })
    } catch (error) {
      console.error('Error in Continue Setup:', error)
      // Sign out and redirect to login
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const selectedPlatforms = user?.user_metadata?.selected_platforms || {}
        const loginRoute = selectedPlatforms.simulator && !selectedPlatforms.platform
          ? '/simulator/login'
          : '/platform/login'
        await supabase.auth.signOut()
        navigate(loginRoute, { replace: true, state: { message: 'Email confirmed successfully! Please log in to continue.', fromEmailConfirmation: true } })
      } catch (signOutError) {
        console.error('Error signing out:', signOutError)
        navigate('/platform/login', { replace: true, state: { message: 'Email confirmed successfully! Please log in to continue.', fromEmailConfirmation: true } })
      }
    } finally {
      setContinueLoading(false)
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <Loader className="h-12 w-12 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verifying your email...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we confirm your email address.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className={`p-3 rounded-full ${
              status === 'success' 
                ? 'bg-green-600' 
                : status === 'error' || status === 'expired'
                ? 'bg-red-600'
                : 'bg-blue-600'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="h-10 w-10 text-white" />
              ) : (
                <Mail className="h-10 w-10 text-white" />
              )}
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {status === 'success' 
              ? 'Email Verified Successfully!'
              : status === 'expired'
              ? 'Confirmation Link Expired'
              : 'Email Verification Failed'
            }
          </h2>
        </div>

        <div className="mt-8">
          {status === 'success' ? (
            <div className="space-y-6">
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      {email ? `Your email (${email}) has been verified!` : 'Your email has been verified successfully!'}
                    </h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      <p>You can now sign in to your account and access all registered platforms.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={continueLoading}
                  onClick={async () => {
                    setContinueLoading(true)
                    try {
                      // Get authenticated user
                      const { data: { user }, error: userError } = await supabase.auth.getUser()
                      
                      if (userError || !user) {
                        console.error('User not authenticated:', userError)
                        // Sign out and redirect to login
                        // Try to determine platform from user metadata or default to Platform
                        const selectedPlatforms = user?.user_metadata?.selected_platforms || {}
                        const loginRoute = selectedPlatforms.simulator && !selectedPlatforms.platform
                          ? '/simulator/login'
                          : '/platform/login'
                        await supabase.auth.signOut()
                        navigate(loginRoute, { replace: true, state: { message: 'Please log in to continue.', fromEmailConfirmation: true } })
                        return
                      }

                      // Step 1: Ensure user record exists using atomic function
                      let userRecord = null
                      try {
                        const { data: userResult, error: userRpcError } = await supabase.rpc('get_or_create_user', {
                          p_auth_user_id: user.id,
                          p_email: user.email || '',
                          p_full_name: user.user_metadata?.full_name || null,
                          p_is_verified: true
                        })

                        if (userRpcError) {
                          console.error('Error getting/creating user:', userRpcError)
                        } else if (userResult && userResult.length > 0) {
                          userRecord = {
                            id: userResult[0].user_id,
                            full_name: userResult[0].full_name_out
                          }
                        }
                      } catch (userError) {
                        console.error('Exception getting/creating user:', userError)
                      }

                      // Step 2: Check platform registration from metadata first (faster)
                      // Note: We can continue even if userRecord is null - platform check uses auth user ID
                      const selectedPlatforms = user.user_metadata?.selected_platforms || {}
                      const registeredForPlatform = selectedPlatforms.platform === true
                      const registeredForSimulator = selectedPlatforms.simulator === true

                      // Step 3: If metadata not available, check database
                      let hasPlatform = registeredForPlatform
                      let hasSimulator = registeredForSimulator

                      if (!hasPlatform && !hasSimulator) {
                        // Check database for platform access
                        try {
                          hasPlatform = await hasRegisteredForPlatform(user.id, 'platform')
                          hasSimulator = await hasRegisteredForPlatform(user.id, 'simulator')
                        } catch (platformError) {
                          console.error('Error checking platform access:', platformError)
                        }

                        // If still no platform access found, try to create from metadata
                        if (!hasPlatform && registeredForPlatform) {
                          try {
                            await registerForPlatform(user.id, 'platform')
                            hasPlatform = true
                          } catch (regError) {
                            console.error('Error registering for platform:', regError)
                          }
                        }

                        if (!hasSimulator && registeredForSimulator) {
                          try {
                            await registerForPlatform(user.id, 'simulator')
                            hasSimulator = true
                          } catch (regError) {
                            console.error('Error registering for simulator:', regError)
                          }
                        }
                      }
                      
                      console.log('Platform access check:', { hasPlatform, hasSimulator, userId: user.id })
                      
                      // Step 4: Sign out user and redirect to appropriate login page
                      // After email confirmation, we sign out so user must manually log in
                      // This ensures they see the login page and can enter their password
                      // Redirect to Simulator login if they registered for Simulator, otherwise Platform login
                      console.log('Email confirmed. Signing out and redirecting to login.')
                      await supabase.auth.signOut()
                      
                      // Determine which login page to redirect to based on platform registration
                      const loginRoute = hasSimulator && !hasPlatform 
                        ? '/simulator/login' 
                        : '/platform/login'
                      
                      navigate(loginRoute, { replace: true, state: { message: 'Email confirmed successfully! Please log in to continue.', fromEmailConfirmation: true } })
                      return
                    } catch (error) {
                      console.error('Error in Continue Setup:', error)
                      // Sign out and redirect to login
                      // Try to determine platform from user metadata or default to Platform
                      const selectedPlatforms = user.user_metadata?.selected_platforms || {}
                      const loginRoute = selectedPlatforms.simulator && !selectedPlatforms.platform
                        ? '/simulator/login'
                        : '/platform/login'
                      await supabase.auth.signOut()
                      navigate(loginRoute, { replace: true, state: { message: 'Email confirmed successfully! Please log in to continue.', fromEmailConfirmation: true } })
                    } finally {
                      setContinueLoading(false)
                    }
                  }}
                >
                  {continueLoading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue Setup
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Sign In Instead
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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

              {status === 'expired' && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        This confirmation link has expired
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        <p>Confirmation links are valid for 24 hours. Please request a new one.</p>
                        <p className="mt-2">
                          <strong>Note:</strong> If you've already verified your email, you can{' '}
                          <Link
                            to="/login"
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 underline"
                          >
                            sign in here
                          </Link>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="your@email.com"
                  />
                  {!email && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Enter your email address to resend the confirmation link
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleResendConfirmation}
                  disabled={resending || !email}
                  className="w-full"
                  variant="outline"
                >
                  {resending ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

