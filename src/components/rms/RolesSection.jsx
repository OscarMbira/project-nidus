/**
 * Risk Roles Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getRoles } from '../../services/rmsRolesResponsibilitiesService'

export default function RolesSection({ rmsId, readOnly = false }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadRoles()
    }
  }, [rmsId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const result = await getRoles(rmsId)
      if (result.success) {
        setRoles(result.data || [])
      }
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Risk Roles & Responsibilities
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Risk management roles and their responsibilities
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading roles...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No risk roles defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{role.role_name}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  role.independence_level === 'external' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  role.independence_level === 'corporate' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  role.independence_level === 'project_independent' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                }`}>
                  {role.independence_level?.replace('_', ' ')}
                </span>
              </div>
              {role.role_description && <p className="text-gray-700 dark:text-gray-300">{role.role_description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
