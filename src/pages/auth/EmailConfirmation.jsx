import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { Mail, CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function EmailConfirmation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error', 'expired'
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState('')
  const errorCheckedRef = useRef(false)

  useEffect(() => {
    // Check for error parameters in URL hash first (Supabase redirects errors in hash)
    const handleInitialCheck = async () => {
      const hasError = await checkForErrors()
      // Only proceed with session check if no error was found
      if (!hasError) {
        checkSession()
      }
    }
    handleInitialCheck()
  }, [])

  const checkForErrors = async () => {
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
  }

  const checkUserVerificationStatus = async (emailAddress) => {
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
  }

  const checkSession = async () => {
    try {
      // Check if user is already authenticated (Supabase may have auto-confirmed)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && session.user) {
        // User is already authenticated, update database and show success
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('auth_user_id', session.user.id)

        if (updateError) {
          console.error('Error updating user verification status:', updateError)
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
  }

  const verifyEmail = async () => {
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
        // Update user record in database
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('auth_user_id', verifyData.user.id)

        if (updateError) {
          console.error('Error updating user verification status:', updateError)
          // Don't fail the verification if DB update fails
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
  }

  const handleResendConfirmation = async () => {
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
        // Show success message with better UX
        const successMessage = document.createElement('div')
        successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successMessage.textContent = 'Confirmation email has been resent. Please check your inbox.'
        document.body.appendChild(successMessage)
        setTimeout(() => {
          document.body.removeChild(successMessage)
        }, 5000)
      }
    } catch (err) {
      console.error('Resend confirmation error:', err)
      setError(err.message || 'An error occurred while resending the confirmation email')
    } finally {
      setResending(false)
    }
  }

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
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <Link to="/login">
                    Sign In to Your Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="text-center">
                  <Link
                    to="/onboarding/role-selection"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Continue Setup (Optional)
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

