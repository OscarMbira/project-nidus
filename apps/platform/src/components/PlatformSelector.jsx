/**
 * Platform Selector Modal
 * Shown after login when user has access to multiple platforms
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Briefcase, Gamepad2, CheckCircle2, Loader } from 'lucide-react'
import { switchPlatform } from '../services/unifiedAuthService'

export default function PlatformSelector({ isOpen, onClose, platforms = [] }) {
  const navigate = useNavigate()
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (isOpen && platforms.length > 0) {
      // Pre-select first platform
      setSelectedPlatform(platforms[0]?.platform)
    }
  }, [isOpen, platforms])

  if (!isOpen || platforms.length <= 1) {
    return null
  }

  const platformInfo = {
    platform: {
      name: 'Platform',
      icon: Briefcase,
      description: 'Manage real projects with your team',
      features: [
        'Project management',
        'Team collaboration',
        'Task tracking',
        'Resource planning',
      ],
    },
    simulator: {
      name: 'Simulator',
      icon: Gamepad2,
      description: 'Practice project management skills',
      features: [
        'Interactive scenarios',
        'Skill development',
        'Progress tracking',
        'Badges & achievements',
      ],
    },
  }

  const handleContinue = async () => {
    if (!selectedPlatform) return

    setSwitching(true)
    try {
      const { data: { user } } = await (await import('../services/supabaseClient')).supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const result = await switchPlatform(user.id, selectedPlatform)
      if (result.success) {
        onClose()
        const redirectPath = selectedPlatform === 'platform' ? '/app/dashboard' : '/simulator/dashboard'
        navigate(redirectPath)
      }
    } catch (error) {
      console.error('Error switching platform:', error)
    } finally {
      setSwitching(false)
    }
  }

  const handleSelectPlatform = (platform) => {
    setSelectedPlatform(platform)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Choose Your Platform
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You have access to multiple platforms. Which one would you like to use?
            </p>
          </div>

          {/* Platform Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {platforms.map((platform) => {
              const info = platformInfo[platform.platform]
              if (!info) return null

              const Icon = info.icon
              const isSelected = selectedPlatform === platform.platform

              return (
                <div
                  key={platform.platform}
                  onClick={() => handleSelectPlatform(platform.platform)}
                  className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}

                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 p-3 rounded-lg ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-800'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {info.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {info.description}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {info.features.map((feature, index) => (
                          <li
                            key={index}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            • {feature}
                          </li>
                        ))}
                      </ul>
                      {platform.hasActiveSubscription && (
                        <span className="mt-2 inline-block px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedPlatform || switching}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {switching ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>

          {/* Note */}
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            You can switch between platforms anytime using the platform switcher in the header
          </p>
        </div>
      </div>
    </div>
  )
}

