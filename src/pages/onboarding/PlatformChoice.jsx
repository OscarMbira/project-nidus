/**
 * Platform Choice Onboarding
 * For users who registered for both Platform and Simulator
 * Allows them to choose which platform to set up first
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Gamepad2, ArrowRight } from 'lucide-react'
import Button from '../../components/ui/Button'
import MainHeader from '../../components/homepage/MainHeader'
import Footer from '../../components/homepage/Footer'

export default function PlatformChoice() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handlePlatformChoice = (platform) => {
    setLoading(true)
    if (platform === 'platform') {
      navigate('/onboarding/platform-account-setup', { replace: true })
    } else {
      navigate('/onboarding/simulator-welcome', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MainHeader />
      <div className="flex-grow py-12 px-4">
        <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Which platform would you like to set up first?
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            You can set up the other platform later from your profile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Platform Option */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Platform
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Set up your account and create your first project. Manage real projects with structured methodologies and powerful collaboration tools.
            </p>
            <Button
              onClick={() => handlePlatformChoice('platform')}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              Set up Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Simulator Option */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Gamepad2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Simulator
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Start your learning journey. Practice project management skills through realistic simulations and interactive scenarios.
            </p>
            <Button
              onClick={() => handlePlatformChoice('simulator')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Start with Simulator
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You can access the other platform from your dashboard anytime
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

