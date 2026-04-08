/**
 * Practice Dashboard Switcher Component
 * 
 * Allows users with both PMO and PM roles to switch between practice dashboards in simulator
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ChevronDown } from 'lucide-react'
import { simDb } from '../../../services/supabase/supabaseClient'
import { getUserSystemRoles } from '../../../services/roleService'

export default function PracticeDashboardSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hasPMORole, setHasPMORole] = useState(false)
  const [hasPMRole, setHasPMRole] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    checkRoles()
  }, [])

  const checkRoles = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const result = await getUserSystemRoles(user.id)
      if (result.success && result.data) {
        const roles = result.data.map(a => a.roles?.role_name).filter(Boolean)
        setHasPMORole(roles.includes('pmo_admin'))
        setHasPMRole(roles.includes('project_manager'))
      }
    } catch (error) {
      console.error('Error checking roles for practice dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPMODashboard = location.pathname.startsWith('/simulator/pmo')
  const isPMDashboard = location.pathname.startsWith('/simulator/pm')

  // Only show if user has both roles
  if (loading || !hasPMORole || !hasPMRole) {
    return null
  }

  const handleSwitch = (targetDashboard) => {
    if (targetDashboard === 'pmo' && !isPMODashboard) {
      navigate('/simulator/pmo/dashboard')
    } else if (targetDashboard === 'pm' && !isPMDashboard) {
      navigate('/simulator/pm/dashboard')
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>
          {isPMODashboard ? 'Practice PMO Dashboard' : isPMDashboard ? 'Practice PM Dashboard' : 'Practice Dashboard'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <button
                onClick={() => handleSwitch('pmo')}
                className={`w-full text-left px-4 py-2 text-sm ${
                  isPMODashboard
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">Practice PMO Dashboard</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Practice Governance & Oversight</div>
              </button>
              <button
                onClick={() => handleSwitch('pm')}
                className={`w-full text-left px-4 py-2 text-sm ${
                  isPMDashboard
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">Practice PM Dashboard</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Practice Project Delivery</div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
