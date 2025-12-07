/**
 * Simulator Welcome Onboarding
 * Welcome page for new Simulator platform users
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, Target, Award, TrendingUp, ArrowRight, Loader } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { updateOnboardingProgress } from '../../services/unifiedSubscriptionService'
import { useToast } from '../../hooks/useToast'

export default function SimulatorWelcome() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [preferredRole, setPreferredRole] = useState('')

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Update onboarding progress
      await updateOnboardingProgress(user.id, 'simulator', 1, true)

      showToast('success', 'Welcome to Simulator!')
      navigate('/simulator/dashboard', { replace: true })
    } catch (error) {
      console.error('Error completing onboarding:', error)
      showToast('error', 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Target,
      title: 'Interactive Scenarios',
      description: 'Practice real-world project management situations',
    },
    {
      icon: Award,
      title: 'Earn Badges',
      description: 'Unlock achievements as you progress',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor your skill development over time',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full">
              <Gamepad2 className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Simulator!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Practice project management skills in a risk-free environment
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Quick Setup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Quick Setup (Optional)
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What's your current skill level?
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSkillLevel(level)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      skillLevel === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {level}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Role (Optional)
              </label>
              <select
                value={preferredRole}
                onChange={(e) => setPreferredRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a role</option>
                <option value="project_manager">Project Manager</option>
                <option value="programme_manager">Programme Manager</option>
                <option value="team_lead">Team Lead</option>
                <option value="business_analyst">Business Analyst</option>
                <option value="team_member">Team Member</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/simulator')}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Skip for now
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin mr-2" />
                Getting Started...
              </>
            ) : (
              <>
                Get Started
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

