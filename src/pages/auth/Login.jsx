import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase, appDb, simDb } from '../../services/supabaseClient'
import SSOLoginButton from '../../components/security/SSOLoginButton'
import PlatformSelector from '../../components/PlatformSelector'
import { login, getRecommendedPlatform, switchPlatform, getUserPlatformAccess } from '../../services/unifiedAuthService'
import { registerForPlatform, PLATFORMS } from '../../services/unifiedSubscriptionService'
import { Mail, Lock, AlertCircle, Loader, LogIn } from 'lucide-react'

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
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
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

        // Check platform access
        let platforms = result.platforms || []
        
        // If no platform access found, try to recover by checking subscriptions
        if (platforms.length === 0) {
          try {
            console.log('No platform access found, attempting recovery...')
            
            // First, check if user record exists in users table
            const { data: userRecord, error: userRecordError } = await appDb
              .from('users')
              .select('id')
              .eq('auth_user_id', result.user.id)
              .maybeSingle()
            
            if (userRecordError) {
              console.error('Error checking user record:', userRecordError)
            }
            
            if (!userRecord) {
              console.warn('User record not found in users table for auth_user_id:', result.user.id)
              // Try to create user record if it doesn't exist
              try {
                const { data: newUserRecord, error: createError } = await appDb
                  .from('users')
                  .insert([
                    {
                      auth_user_id: result.user.id,
                      email: result.user.email,
                      full_name: result.user.user_metadata?.full_name || result.user.email?.split('@')[0] || 'User',
                      is_active: true,
                      is_verified: result.user.email_confirmed_at !== null,
                    },
                  ])
                  .select()
                  .single()
                
                if (createError) {
                  if (createError.code === '23505' || createError.message?.includes('duplicate')) {
                    console.log('User record was created by another process')
                  } else {
                    console.error('Error creating user record during login:', createError)
                  }
                } else {
                  console.log('Created user record during login recovery:', newUserRecord)
                }
              } catch (createUserError) {
                console.error('Exception creating user record:', createUserError)
              }
            }
            
            // Check if user has PM subscription (using appDb for public schema)
            // pm_subscriptions.user_id references auth.users.id
            // Status can be: 'active', 'trialing', 'paused' (we accept any non-cancelled/expired)
            // Handle RLS errors gracefully
            let pmSub = null
            try {
              const { data, error: pmError } = await appDb
                .from('pm_subscriptions')
                .select('id, status, plan_type')
                .eq('user_id', result.user.id)
                .in('status', ['active', 'trialing', 'paused', 'past_due'])
                .limit(1)
                .maybeSingle()
              
              if (pmError) {
                // Check if it's an RLS recursion error
                if (pmError.code === '42P17' || pmError.message?.includes('infinite recursion')) {
                  console.warn('RLS recursion error on pm_subscriptions, trying alternative check')
                  // Try to check via user_platform_access instead
                  const { data: platformAccess } = await appDb
                    .from('user_platform_access')
                    .select('platform')
                    .eq('user_id', result.user.id)
                    .eq('platform', 'pm')
                    .maybeSingle()
                  
                  if (platformAccess) {
                    pmSub = { id: 'exists', status: 'active' } // Mark as existing
                  }
                } else {
                  console.error('Error checking PM subscription:', pmError)
                }
              } else {
                pmSub = data
              }
            } catch (pmCheckError) {
              console.error('Exception checking PM subscription:', pmCheckError)
            }
            
            if (pmSub) {
              console.log('Found PM subscription:', pmSub)
              try {
                await registerForPlatform(result.user.id, PLATFORMS.PM)
                console.log('Successfully registered for PM platform')
              } catch (pmRegError) {
                console.error('Error registering PM platform:', pmRegError)
              }
            }
            
            // Check if user has Simulator subscription (using simDb for sim schema)
            // Note: simulator_subscriptions uses user_id which references auth.users.id
            // Accept any subscription that's not cancelled or expired
            let simSub = null
            try {
              const { data, error: simError } = await simDb
                .from('simulator_subscriptions')
                .select('id, status, plan_type')
                .eq('user_id', result.user.id)
                .in('status', ['active', 'trialing', 'paused', 'past_due'])
                .limit(1)
                .maybeSingle()
              
              if (simError) {
                // Check if it's an RLS recursion error
                if (simError.code === '42P17' || simError.message?.includes('infinite recursion')) {
                  console.warn('RLS recursion error on simulator_subscriptions, trying alternative check')
                  // Try to check via user_platform_access instead
                  const { data: platformAccess } = await appDb
                    .from('user_platform_access')
                    .select('platform')
                    .eq('user_id', result.user.id)
                    .eq('platform', 'simulator')
                    .maybeSingle()
                  
                  if (platformAccess) {
                    simSub = { id: 'exists', status: 'active' } // Mark as existing
                  }
                } else {
                  console.error('Error checking Simulator subscription:', simError)
                }
              } else {
                simSub = data
              }
            } catch (simCheckError) {
              console.error('Exception checking Simulator subscription:', simCheckError)
            }
            
            if (simSub) {
              console.log('Found Simulator subscription:', simSub)
              try {
                await registerForPlatform(result.user.id, PLATFORMS.SIMULATOR)
                console.log('Successfully registered for Simulator platform')
              } catch (simRegError) {
                console.error('Error registering Simulator platform:', simRegError)
              }
            }
            
            // If still no platforms, check user_platform_access directly
            // Maybe records exist but has_registered is false
            const { data: platformAccess, error: platformAccessError } = await appDb
              .from('user_platform_access')
              .select('*')
              .eq('user_id', result.user.id)
            
            if (platformAccessError) {
              console.error('Error checking platform access:', platformAccessError)
            } else if (platformAccess && platformAccess.length > 0) {
              console.log('Found platform access records:', platformAccess)
              // Update has_registered to true for existing records
              for (const access of platformAccess) {
                if (!access.has_registered) {
                  try {
                    const { error: updateError } = await appDb
                      .from('user_platform_access')
                      .update({ has_registered: true })
                      .eq('id', access.id)
                    
                    if (updateError) {
                      console.error('Error updating platform access:', updateError)
                    } else {
                      console.log('Updated platform access for:', access.platform)
                    }
                  } catch (updateError) {
                    console.error('Error updating platform access:', updateError)
                  }
                }
              }
            }
            
            // Re-fetch platform access after recovery
            const platformResult = await getUserPlatformAccess(result.user.id)
            if (platformResult.success) {
              platforms = platformResult.platforms || []
              console.log('Platforms after recovery:', platforms)
            } else {
              console.error('Error re-fetching platform access:', platformResult.error)
            }
            
            // If still no platforms after all recovery attempts, check if user record exists
            // If user exists, they should have at least one platform (create default PM access)
            if (platforms.length === 0 && userRecord) {
              console.log('User exists but no platform access found, creating default PM platform access...')
              try {
                await registerForPlatform(result.user.id, PLATFORMS.PM)
                const finalResult = await getUserPlatformAccess(result.user.id)
                if (finalResult.success) {
                  platforms = finalResult.platforms || []
                  console.log('Created default PM platform access, platforms:', platforms)
                }
              } catch (defaultError) {
                console.error('Error creating default platform access:', defaultError)
              }
            }
          } catch (recoveryError) {
            console.error('Error recovering platform access:', recoveryError)
            console.error('Recovery error details:', {
              message: recoveryError.message,
              stack: recoveryError.stack,
              name: recoveryError.name
            })
          }
        }
        
        setUserPlatforms(platforms)

        if (platforms.length === 0) {
          // No platform access - redirect to registration
          setError('You need to register for at least one platform. Please sign up.')
          setLoading(false)
          return
        }

        if (platforms.length === 1) {
          // Single platform - auto-redirect
          const platform = platforms[0].platform
          await switchPlatform(result.user.id, platform)
          
          const redirectPath = platform === 'pm' ? '/app/dashboard' : '/simulator/dashboard'
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
      
      const redirectPath = platform === 'pm' ? '/app/dashboard' : '/simulator/dashboard'
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
    <>
      <PlatformSelector
        isOpen={showPlatformSelector}
        onClose={() => setShowPlatformSelector(false)}
        platforms={userPlatforms}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
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
    </>
  )
}

