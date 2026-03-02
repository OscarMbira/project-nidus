import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase, appDb, simDb } from '../../services/supabaseClient'
import SSOLoginButton from '../../components/security/SSOLoginButton'
import PlatformSelector from '../../components/PlatformSelector'
import { login, getUserPlatformAccess } from '../../services/unifiedAuthService'
import { registerForPlatform, updatePlatformAccess, PLATFORMS } from '../../services/unifiedSubscriptionService'
import { Mail, Lock, AlertCircle, Loader, LogIn } from 'lucide-react'
import MainHeader from '../../components/homepage/MainHeader'
import Footer from '../../components/homepage/Footer'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState(location.state?.message || null)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const [userPlatforms, setUserPlatforms] = useState([])

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/app/dashboard'

  useEffect(() => {
    // Check if user is already authenticated
    // But don't auto-redirect if they're coming from email confirmation
    // (They should manually log in after email confirmation)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // If coming from email confirmation, don't auto-redirect
      // User should manually log in
      if (location.state?.fromEmailConfirmation || location.state?.message?.includes('Email confirmed')) {
        return // Stay on login page
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate(from, { replace: true })
      }
    } catch (error) {
      // User not authenticated, stay on login page
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Use unified auth service
      const result = await login(email, password)

      if (!result.success) {
        setError(result.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (result.user) {
        // Check if email is verified
        if (!result.user.email_confirmed_at && !result.user.confirmed_at) {
          setError('Please verify your email address before signing in. Check your inbox for the confirmation email.')
          setLoading(false)
          return
        }

        // ── Org check: use data already fetched inside login() ──────────────
        if (result.requiresOrganisationSetup) {
          navigate('/onboarding/organisation-setup', { replace: true })
          setLoading(false)
          return
        }

        // ── Platform access ───────────────────────────────────────────────
        let platforms = result.platforms || []

        // Recovery block: only runs when platform access is missing.
        // PM + SIM subscription queries run in parallel to minimise latency.
        if (platforms.length === 0) {
          try {
            // 1. Check user record + both subscriptions in parallel
            const [
              userRecordResult,
              pmSubResult,
              simSubResult,
            ] = await Promise.allSettled([
              appDb.from('users').select('id').eq('auth_user_id', result.user.id).maybeSingle(),
              appDb
                .from('platform_subscriptions')
                .select('id, status, plan_type')
                .eq('user_id', result.user.id)
                .in('status', ['active', 'trialing', 'paused', 'past_due'])
                .limit(1)
                .maybeSingle(),
              simDb
                .from('simulator_subscriptions')
                .select('id, status, plan_type')
                .eq('user_id', result.user.id)
                .in('status', ['active', 'trialing', 'paused', 'past_due'])
                .limit(1)
                .maybeSingle(),
            ])

            const userRecord =
              userRecordResult.status === 'fulfilled' ? userRecordResult.value?.data : null

            // Handle missing user record
            if (!userRecord) {
              try {
                const { error: createError } = await appDb.from('users').insert([
                  {
                    auth_user_id: result.user.id,
                    email: result.user.email,
                    full_name:
                      result.user.user_metadata?.full_name ||
                      result.user.email?.split('@')[0] ||
                      'User',
                    is_active: true,
                    is_verified: result.user.email_confirmed_at !== null,
                  },
                ])
                if (createError && createError.code !== '23505') {
                  console.error('Error creating user record during login:', createError)
                }
              } catch (createUserError) {
                console.error('Exception creating user record:', createUserError)
              }
            }

            // Register platforms found via subscription checks
            let pmSub = null
            if (pmSubResult.status === 'fulfilled') {
              const { data, error: pmError } = pmSubResult.value
              if (pmError?.code === '42P17' || pmError?.message?.includes('infinite recursion')) {
                // RLS fallback: check user_platform_access directly
                const { data: pa } = await appDb
                  .from('user_platform_access')
                  .select('platform')
                  .eq('user_id', result.user.id)
                  .eq('platform', 'platform')
                  .maybeSingle()
                if (pa) pmSub = { id: 'exists', status: 'active' }
              } else {
                pmSub = data
              }
            }

            let simSub = null
            if (simSubResult.status === 'fulfilled') {
              const { data, error: simError } = simSubResult.value
              if (simError?.code === '42P17' || simError?.message?.includes('infinite recursion')) {
                const { data: pa } = await appDb
                  .from('user_platform_access')
                  .select('platform')
                  .eq('user_id', result.user.id)
                  .eq('platform', 'simulator')
                  .maybeSingle()
                if (pa) simSub = { id: 'exists', status: 'active' }
              } else {
                simSub = data
              }
            }

            // Register for found platforms in parallel
            const registrations = []
            if (pmSub) registrations.push(registerForPlatform(result.user.id, PLATFORMS.PLATFORM).catch(console.error))
            if (simSub) registrations.push(registerForPlatform(result.user.id, PLATFORMS.SIMULATOR).catch(console.error))
            if (registrations.length > 0) await Promise.all(registrations)

            // Fix stale has_registered flags
            const { data: platformAccess } = await appDb
              .from('user_platform_access')
              .select('*')
              .eq('user_id', result.user.id)

            if (platformAccess?.length > 0) {
              const stale = platformAccess.filter((a) => !a.has_registered)
              await Promise.all(
                stale.map((access) =>
                  appDb
                    .from('user_platform_access')
                    .update({
                      has_registered: true,
                      registration_date: access.registration_date || new Date().toISOString(),
                    })
                    .eq('id', access.id)
                    .catch(console.error)
                )
              )
            }

            // Re-fetch after recovery
            const platformResult = await getUserPlatformAccess(result.user.id)
            if (platformResult.success) {
              platforms = platformResult.platforms || []
            }

            // Last resort: create default Platform access if user record exists
            if (platforms.length === 0 && userRecord) {
              try {
                await registerForPlatform(result.user.id, PLATFORMS.PLATFORM)
                const finalResult = await getUserPlatformAccess(result.user.id)
                if (finalResult.success) platforms = finalResult.platforms || []
              } catch (defaultError) {
                console.error('Error creating default platform access:', defaultError)
              }
            }
          } catch (recoveryError) {
            console.error('Error recovering platform access:', recoveryError)
          }
        }

        setUserPlatforms(platforms)

        if (platforms.length === 0) {
          // Check verification status for appropriate error message
          const { data: userRec } = await appDb
            .from('users')
            .select('is_verified')
            .eq('auth_user_id', result.user.id)
            .maybeSingle()

          if (userRec && !userRec.is_verified) {
            setError('Please verify your email address before signing in. Check your inbox for the confirmation email.')
          } else if (userRec) {
            setError("Your account exists but you haven't completed platform registration. Please sign up to register for a platform.")
          } else {
            setError('You need to register for at least one platform. Please sign up.')
          }
          setLoading(false)
          return
        }

        if (platforms.length === 1) {
          // Single platform — navigate immediately; update access in background
          const platform = platforms[0].platform
          sessionStorage.setItem('currentPlatform', platform)
          updatePlatformAccess(result.user.id, platform).catch(() => {})
          const redirectPath =
            platform === 'platform' || platform === 'pm' ? '/app/dashboard' : '/simulator/dashboard'
          navigate(redirectPath, { replace: true })
        } else {
          // Multiple platforms - show selector
          setShowPlatformSelector(true)
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handlePlatformSelected = async (platform) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await switchPlatform(user.id, platform)
      setShowPlatformSelector(false)
      
      const redirectPath = platform === 'platform' || platform === 'pm' ? '/app/dashboard' : '/simulator/dashboard'
      navigate(redirectPath, { replace: true })
    } catch (error) {
      console.error('Error selecting platform:', error)
      setError('Failed to switch platform. Please try again.')
    }
  }

  const handleSSOLoginStart = () => {
    setSsoLoading(true)
  }

  const handleSSOLoginComplete = () => {
    setSsoLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MainHeader />
      <PlatformSelector
        isOpen={showPlatformSelector}
        onClose={() => setShowPlatformSelector(false)}
        platforms={userPlatforms}
      />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <LogIn className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8">
          {/* SSO Login Options */}
          <SSOLoginButton 
            onLoginStart={handleSSOLoginStart}
            onLoginComplete={handleSSOLoginComplete}
          />

          {ssoLoading && (
            <div className="mt-4 flex items-center justify-center">
              <Loader className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Redirecting to SSO provider...
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Traditional Login Form */}
          <form className="mt-6 space-y-6" onSubmit={handleLogin}>
            {infoMessage && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {infoMessage}
                    </h3>
                  </div>
                </div>
              </div>
            )}

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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-xs">🔒 You will be logged out when browser closes</span>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot your password?
                </Link>
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
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

