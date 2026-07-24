/**
 * Assign Roles to Projects Page
 *
 * PMO Admin function to assign roles to users in projects
 * Optimized for performance with memoization, parallel API calls, and caching
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Shield,
  Users,
  FolderKanban,
  CheckCircle,
  Loader,
  AlertCircle,
  Save,
  UserPlus,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import {
  isPMOAdmin,
  getAllProjects,
  getProjectRoles,
  assignRoleToProject,
  getOrganizationUsers
} from '../../services/pmoAdminService'

// Cache for project roles to prevent redundant API calls
const rolesCache = new Map()

export default function AssignRolesToProjects() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loadingRoles, setLoadingRoles] = useState(false)
  
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)

  /** Serializes async role loads so stale responses cannot leave loading stuck or wrong list */
  const loadRolesRequestRef = useRef(0)

  // Refs for managing auto-dismiss timers
  const errorTimerRef = useRef(null)
  const successTimerRef = useRef(null)

  // Auto-dismiss error messages after 7 seconds
  useEffect(() => {
    if (error) {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current)
      }
      errorTimerRef.current = setTimeout(() => {
        setError(null)
      }, 7000)
      return () => {
        if (errorTimerRef.current) {
          clearTimeout(errorTimerRef.current)
        }
      }
    }
  }, [error])

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
      successTimerRef.current = setTimeout(() => {
        setSuccess(null)
      }, 5000)
      return () => {
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current)
        }
      }
    }
  }, [success])

  // Initialize page - parallelize API calls for better performance
  useEffect(() => {
    checkAccessAndLoadData().catch(err => {
      setError('Failed to initialize page. Please refresh.')
      setLoading(false)
    })
  }, [])

  // Load project roles when project is selected (with caching)
  useEffect(() => {
    if (selectedProject) {
      loadProjectRoles(selectedProject)
    } else {
      setAvailableRoles([])
      setSelectedRole('')
    }
  }, [selectedProject])

  // Memoized checkAccessAndLoadData function
  const checkAccessAndLoadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('Please log in to access this page')
        setLoading(false)
        navigate('/login')
        return
      }

      // Check admin status and load data in parallel for better performance
      const [adminCheck, projectsResult, usersResult] = await Promise.allSettled([
        isPMOAdmin(user.id),
        getAllProjects(),
        getOrganizationUsers()
      ])

      // Handle admin check
      if (adminCheck.status === 'fulfilled' && adminCheck.value) {
        setIsAdmin(true)
      } else {
        setError('Only PMO Admin can access this page')
        setLoading(false)
        return
      }

      // Handle projects result
      if (projectsResult.status === 'fulfilled' && projectsResult.value.success) {
        setProjects(projectsResult.value.data || [])
      } else {
        const errorMsg = projectsResult.status === 'rejected' 
          ? 'Failed to load projects. Please try again.'
          : projectsResult.value?.error || 'Failed to load projects'
        setError(errorMsg)
      }

      if (usersResult.status === 'fulfilled' && usersResult.value.success) {
        setUsers(usersResult.value.data || [])
      } else if (usersResult.status === 'fulfilled' && usersResult.value && !usersResult.value.success) {
        setError(usersResult.value.error || 'Failed to load users for assignment')
      } else if (usersResult.status === 'rejected') {
        setError(usersResult.reason?.message || 'Failed to load users')
      }
    } catch (err) {
      setError(err.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Load project roles with caching
  const loadProjectRoles = useCallback(async (projectId) => {
    // Check cache first — must clear loading; otherwise a slow in-flight fetch can leave UI stuck
    if (rolesCache.has(projectId)) {
      setAvailableRoles(rolesCache.get(projectId))
      setLoadingRoles(false)
      return
    }

    const requestId = ++loadRolesRequestRef.current
    try {
      setLoadingRoles(true)
      const rolesResult = await getProjectRoles(projectId)
      if (requestId !== loadRolesRequestRef.current) return
      if (rolesResult.success) {
        const roles = rolesResult.data || []
        setAvailableRoles(roles)
        rolesCache.set(projectId, roles)
      } else {
        setAvailableRoles([])
        setError(rolesResult.error)
      }
    } catch (err) {
      if (requestId !== loadRolesRequestRef.current) return
      setAvailableRoles([])
      setError(err.message || 'Failed to load project roles')
    } finally {
      if (requestId === loadRolesRequestRef.current) {
        setLoadingRoles(false)
      }
    }
  }, [])

  // Handle form submission
  const handleAssignRole = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setAssigning(true)

    try {
      if (!selectedProject || !selectedUser || !selectedRole) {
        setError('Please select project, user, and role')
        setAssigning(false)
        return
      }

      const result = await assignRoleToProject(
        selectedProject,
        selectedUser,
        selectedRole
      )

      if (result.success) {
        setSuccess('Role assigned successfully')
        // Clear form
        setSelectedProject('')
        setSelectedUser('')
        setSelectedRole('')
        setAvailableRoles([])
        // Invalidate cache for this project to ensure fresh data on next load
        rolesCache.delete(selectedProject)
      } else {
        setError(result.error || 'Failed to assign role')
      }
    } catch (err) {
      setError(err.message || 'Failed to assign role')
    } finally {
      setAssigning(false)
    }
  }, [selectedProject, selectedUser, selectedRole])

  // Handle clear form
  const handleClear = useCallback(() => {
    setSelectedProject('')
    setSelectedUser('')
    setSelectedRole('')
    setAvailableRoles([])
    setError(null)
    setSuccess(null)
  }, [])

  // Handle project change
  const handleProjectChange = useCallback((e) => {
    setSelectedProject(e.target.value)
    setSelectedRole('')
  }, [])

  // Memoized role select options text
  const roleSelectPlaceholder = useMemo(() => {
    if (!selectedProject) return 'Select a project first'
    if (loadingRoles) return 'Loading roles...'
    if (availableRoles.length === 0) return 'No roles available'
    return 'Choose a role...'
  }, [selectedProject, loadingRoles, availableRoles.length])

  // Memoized form validation
  const isFormValid = useMemo(() => {
    return !!(selectedProject && selectedUser && selectedRole && !loadingRoles)
  }, [selectedProject, selectedUser, selectedRole, loadingRoles])

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-2 sm:gap-3">
            <Shield className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            <span>Assign Roles to Projects</span>
          </span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
          Assign roles to users in specific projects. Team Manager and Team Member roles are reserved for Project Managers.
        </p>
      </div>

      {/* Show loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )}

      {/* Show access denied if not admin */}
      {!loading && !isAdmin && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Only PMO Admin can access this page'}
            </p>
            <button
              onClick={() => navigate('/platform/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start sm:items-center">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm sm:text-base text-red-800 dark:text-red-200 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start sm:items-center">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm sm:text-base text-green-800 dark:text-green-200 break-words">{success}</p>
          </div>
        </div>
      )}

      {/* Show form only if admin and not loading */}
      {!loading && isAdmin && (
        <>
          {projects.length === 0 && users.length === 0 && !error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start sm:items-center">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
                  No projects or users found. Please ensure you have projects and users in your organization.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5 md:p-6">
            <form onSubmit={handleAssignRole} className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center">
                    <FolderKanban className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Select Project *</span>
                  </span>
                </label>
                <select
                  value={selectedProject}
                  onChange={handleProjectChange}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} ({project.project_code || 'No code'})
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selection */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Select User *</span>
                    </span>
                  </label>
                  <Link
                    to="/platform/project-members"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <UserPlus className="h-4 w-4 flex-shrink-0" />
                    Add users to project
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  </Link>
                </div>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || 'No name'} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Selection */}
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Select Role *</span>
                    </span>
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    required
                    disabled={loadingRoles || availableRoles.length === 0}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{roleSelectPlaceholder}</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.role_display_name || role.role_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Note: Team Manager and Team Member roles are not available here. They can only be assigned by Project Managers.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={assigning || !isFormValid}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                >
                  {assigning ? (
                    <>
                      <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Assign Role</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
