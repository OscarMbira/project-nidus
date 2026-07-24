import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase, appDb, simDb } from '../../services/supabaseClient'
import SSOLoginButton from '../../components/security/SSOLoginButton'
import PlatformSelector from '../../components/PlatformSelector'
import { login, getRecommendedPlatform, switchPlatform, getUserPlatformAccess } from '../../services/unifiedAuthService'
import { registerForPlatform, PLATFORMS } from '../../services/unifiedSubscriptionService'
import { getSimulatorPostLoginRoute } from '../../services/postLoginRouter'
import { Mail, Lock, AlertCircle, Loader, LogIn } from 'lucide-react'
import SimulatorHeader from '../../components/homepage/SimulatorHeader'
import SimulatorFooter from '../../components/homepage/SimulatorFooter'

export default function SimulatorLogin() {
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
  const from = location.state?.from?.pathname || '/simulator/dashboard'

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

      if (result.success && result.user) {
        // Check platform access
        let platformAccessResult = await getUserPlatformAccess(result.user.id)
        let hasSimulator = platformAccessResult.success && platformAccessResult.platforms && 
                          platformAccessResult.platforms.some(p => p.platform === 'simulator' && p.has_registered)
        
        // If no platform access found, try to recover/create it
        if (!hasSimulator) {
          try {
            // Check if user just confirmed email (coming from email confirmation)
            const fromEmailConfirmation = location.state?.fromEmailConfirmation || location.state?.message?.includes('Email confirmed')
            
            // Always try to register for Simulator if access is missing
            // This handles cases where registration didn't complete or record wasn't created
            console.log('Simulator access not found, attempting to register for Simulator...')
            try {
              await registerForPlatform(result.user.id, PLATFORMS.SIMULATOR)
              console.log('Successfully registered for Simulator during login recovery')
            } catch (registerError) {
              console.error('Error registering for Simulator:', registerError)
              // Registration failed - user needs to register for Simulator
              setError('You do not have access to the Simulator. Please register for Simulator access first.')
              setLoading(false)
              return
            }
            
            // Re-check platform access after recovery
            platformAccessResult = await getUserPlatformAccess(result.user.id)
            hasSimulator = platformAccessResult.success && platformAccessResult.platforms && 
                          platformAccessResult.platforms.some(p => p.platform === 'simulator' && p.has_registered)
          } catch (recoveryError) {
            console.error('Error recovering platform access:', recoveryError)
            // If recovery fails and still no access, show error
            if (!hasSimulator) {
              setError('You do not have access to the Simulator. Please register for Simulator access first.')
              setLoading(false)
              return
            }
          }
        }
        
        // Verify user has Simulator access after recovery attempts
        if (!hasSimulator) {
          setError('You do not have access to the Simulator. Please register for Simulator access first.')
          setLoading(false)
          return
        }

        // Get simulator post-login route based on organisation status and role
        const routeResult = await getSimulatorPostLoginRoute(result.user.id)
        navigate(routeResult.route, { replace: true })
      } else {
        setError(result.error || 'Login failed. Please check your credentials.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSSOLoginStart = () => {
    setSsoLoading(true)
    setError(null)
  }

  const handleSSOLoginComplete = async (error, data) => {
    setSsoLoading(false)
    
    if (error) {
      setError(error.message || 'SSO login failed')
      return
    }

    if (data?.user) {
      try {
        // Check platform access
        let platformAccessResult = await getUserPlatformAccess(data.user.id)
        let hasSimulator = platformAccessResult.success && platformAccessResult.platforms && 
                          platformAccessResult.platforms.some(p => p.platform === 'simulator' && p.has_registered)
        
        // If no platform access found, try to recover/create it
        if (!hasSimulator) {
          try {
            console.log('Simulator access not found for SSO user, attempting to register...')
            await registerForPlatform(data.user.id, PLATFORMS.SIMULATOR)
            
            // Re-check platform access
            platformAccessResult = await getUserPlatformAccess(data.user.id)
            hasSimulator = platformAccessResult.success && platformAccessResult.platforms && 
                          platformAccessResult.platforms.some(p => p.platform === 'simulator' && p.has_registered)
          } catch (recoveryError) {
            console.error('Error recovering platform access for SSO:', recoveryError)
          }
        }
        
        // Verify user has Simulator access after recovery attempts
        if (!hasSimulator) {
          setError('You do not have access to the Simulator. Please register for Simulator access first.')
          return
        }

        // Get simulator post-login route
        const routeResult = await getSimulatorPostLoginRoute(data.user.id)
        navigate(routeResult.route, { replace: true })
      } catch (err) {
        console.error('Error after SSO login:', err)
        setError('An error occurred after login')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <SimulatorHeader />
      <PlatformSelector
        isOpen={showPlatformSelector}
        onClose={() => setShowPlatformSelector(false)}
        platforms={userPlatforms}
      />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="p-3 bg-green-600 rounded-full">
              <LogIn className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to Simulator
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/simulator/register"
              className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
            >
              create a new Simulator account
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
              <Loader className="h-5 w-5 animate-spin text-green-600" />
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
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
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
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
                >
                  Forgot your password?
                </Link>
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
                    Signing in...
                  </>
                ) : (
                  'Sign in to Simulator'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have a Simulator account?{' '}
              <Link
                to="/simulator/register"
                className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
              >
                Sign up for Simulator
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Need Platform instead?{' '}
              <Link
                to="/platform/login"
                className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
              >
                Sign in to Platform
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
      <SimulatorFooter />
    </div>
  )
}

