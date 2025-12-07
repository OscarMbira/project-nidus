/**
 * Platform Switcher Component
 * Header component for users with multiple platforms
 */

import { useState, useRef, useEffect } from 'react'
import { Briefcase, Gamepad2, ChevronDown, Check } from 'lucide-react'
import { usePlatform } from '../context/PlatformContext'

export default function PlatformSwitcher() {
  const { currentPlatform, platforms, changePlatform, hasMultiplePlatforms } = usePlatform()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!hasMultiplePlatforms || platforms.length <= 1) {
    return null
  }

  const platformInfo = {
    pm: {
      name: 'PM Platform',
      icon: Briefcase,
    },
    simulator: {
      name: 'PM Simulator',
      icon: Gamepad2,
    },
  }

  const currentInfo = platformInfo[currentPlatform] || platformInfo.pm
  const CurrentIcon = currentInfo.icon

  const handleSwitch = async (platform) => {
    if (platform === currentPlatform) {
      setIsOpen(false)
      return
    }

    await changePlatform(platform)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <CurrentIcon className="h-4 w-4" />
        <span>{currentInfo.name}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Switch Platform
            </div>
            {platforms.map((platform) => {
              const info = platformInfo[platform.platform]
              if (!info) return null

              const Icon = info.icon
              const isActive = platform.platform === currentPlatform

              return (
                <button
                  key={platform.platform}
                  onClick={() => handleSwitch(platform.platform)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{info.name}</span>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

