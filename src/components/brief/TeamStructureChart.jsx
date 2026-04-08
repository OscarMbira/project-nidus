/**
 * Team Structure Chart Component
 * Visual org chart based on role descriptions and reporting relationships
 */

import { useState, useEffect } from 'react'
import { getRoles } from '../../services/briefRolesService'
import { Users, User, ChevronDown, ChevronRight } from 'lucide-react'

export default function TeamStructureChart({ briefId, readOnly = false }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  useEffect(() => {
    if (briefId) {
      loadRoles()
    }
  }, [briefId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await getRoles(briefId)
      setRoles(data || [])
      // Auto-expand all nodes initially
      setExpandedNodes(new Set(data?.map(r => r.id) || []))
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (roleId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(roleId)) {
        next.delete(roleId)
      } else {
        next.add(roleId)
      }
      return next
    })
  }

  // Build hierarchy tree
  const buildHierarchy = () => {
    const roleMap = new Map()
    const rootRoles = []

    // Create map of all roles
    roles.forEach(role => {
      roleMap.set(role.id, {
        ...role,
        children: []
      })
    })

    // Build parent-child relationships
    roles.forEach(role => {
      const roleNode = roleMap.get(role.id)
      if (role.reporting_to) {
        // Try to find parent by name or ID
        const parent = Array.from(roleMap.values()).find(
          r => r.role_name === role.reporting_to || 
               r.id === role.reporting_to ||
               (role.reporting_to_role_id && r.id === role.reporting_to_role_id)
        )
        if (parent) {
          parent.children.push(roleNode)
        } else {
          // No parent found, treat as root
          rootRoles.push(roleNode)
        }
      } else {
        // No reporting_to, treat as root
        rootRoles.push(roleNode)
      }
    })

    // If no hierarchy found, group by category
    if (rootRoles.length === 0 || rootRoles.length === roles.length) {
      const byCategory = {}
      roles.forEach(role => {
        const category = role.role_category || 'other'
        if (!byCategory[category]) {
          byCategory[category] = []
        }
        byCategory[category].push(roleMap.get(role.id))
      })
      return Object.values(byCategory).flat()
    }

    return rootRoles
  }

  const renderRoleNode = (role, level = 0) => {
    const hasChildren = role.children && role.children.length > 0
    const isExpanded = expandedNodes.has(role.id)
    const indent = level * 24

    return (
      <div key={role.id} className="mb-2">
        <div
          className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          style={{ marginLeft: `${indent}px` }}
          onClick={() => hasChildren && toggleNode(role.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <div className="w-4" />
          )}
          
          <div className={`p-2 rounded ${getRoleCategoryColor(role.role_category)}`}>
            {hasChildren ? (
              <Users className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {role.role_name}
              </h4>
              {role.is_mandatory && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                  Mandatory
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs capitalize ${getCategoryBadgeColor(role.role_category)}`}>
                {role.role_category?.replace('_', ' ') || 'Other'}
              </span>
            </div>
            {role.assigned_to_name || role.assigned_user?.full_name ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Assigned: {role.assigned_to_name || role.assigned_user?.full_name}
              </p>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                Not yet assigned
              </p>
            )}
            {role.time_commitment && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Time: {role.time_commitment}
              </p>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {role.children.map(child => renderRoleNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getRoleCategoryColor = (category) => {
    const colors = {
      executive: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      project_board: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      project_manager: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      team_manager: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      project_assurance: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      project_support: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      specialist: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    }
    return colors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getCategoryBadgeColor = (category) => {
    const colors = {
      executive: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      project_board: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      project_manager: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      team_manager: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      project_assurance: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      project_support: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      specialist: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    }
    return colors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before viewing team structure chart
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading team structure...</div>
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No roles defined yet. Add roles in the Role Descriptions section to see the team structure chart.
      </div>
    )
  }

  const hierarchy = buildHierarchy()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Structure Chart</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {roles.length} role{roles.length !== 1 ? 's' : ''} defined
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        {hierarchy.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Unable to build hierarchy. Check reporting relationships in role descriptions.
          </div>
        ) : (
          <div className="space-y-2">
            {hierarchy.map(role => renderRoleNode(role, 0))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900 rounded"></div>
            <span>Executive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded"></div>
            <span>Project Board</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded"></div>
            <span>Project Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900 rounded"></div>
            <span>Team Manager</span>
          </div>
        </div>
      </div>
    </div>
  )
}
