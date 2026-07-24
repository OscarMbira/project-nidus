/**
 * Platform Selection Page
 * 
 * Allows users to choose which platform to register for (Platform or Simulator)
 * Redirects to the appropriate registration page
 */

import { useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Briefcase, Gamepad2, ArrowRight } from 'lucide-react'
import MainHeader from '../../components/homepage/MainHeader'
import { supabase } from '../../services/supabaseClient'

export default function Register() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/platform/dashboard', { replace: true })
      }
    } catch (error) {
      // User not authenticated, stay on page
    }
  }

  const handlePlatformSelect = (platform) => {
    if (platform === 'platform') {
      navigate('/platform/register', { replace: true })
    } else if (platform === 'simulator') {
      navigate('/simulator/register', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MainHeader />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Choose Your Platform
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Select which platform you'd like to register for. You can only register for one platform at a time.
            </p>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Option */}
            <div
              onClick={() => handlePlatformSelect('platform')}
              className="relative flex flex-col p-6 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100 dark:bg-blue-800">
                  <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Platform
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Real project management for your team. Create, manage, and deliver projects with powerful tools.
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Register for Platform
                </button>
              </div>
            </div>

            {/* Simulator Option */}
            <div
              onClick={() => handlePlatformSelect('simulator')}
              className="relative flex flex-col p-6 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-green-100 dark:bg-green-800">
                  <Gamepad2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <ArrowRight className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Simulator
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Practice PM skills in a risk-free environment. Learn and experiment without consequences.
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Register for Simulator
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need help choosing? <Link to="/platform" className="text-blue-600 hover:text-blue-500">Learn about Platform</Link> or <Link to="/simulator" className="text-green-600 hover:text-green-500">Learn about Simulator</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
