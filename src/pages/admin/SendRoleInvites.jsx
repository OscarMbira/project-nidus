/**
 * Send Role Invites Page
 *
 * PMO Admin function to send email invitations with roles
 * Excludes Team Manager and Team Member (reserved for Project Managers)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  FolderKanban,
  Shield,
  CheckCircle,
  X,
  Loader,
  AlertCircle,
  Send,
  UserPlus
} from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import {
  isPMOAdmin,
  getAllProjects,
  getProjectRoles,
  sendRoleInvitation
} from '../../services/pmoAdminService'

export default function SendRoleInvites() {
  // Debug: Log component render
  console.log('[SendRoleInvites] Component rendering')
  
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    console.log('[SendRoleInvites] useEffect running')
    setMounted(true)
    checkAccessAndLoadData().catch(err => {
      console.error('[SendRoleInvites] Unhandled error in checkAccessAndLoadData:', err)
      setError('Failed to initialize page. Please refresh.')
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectRoles(selectedProject)
    }
  }, [selectedProject])

  const checkAccessAndLoadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        setError('Please log in to access this page')
        setLoading(false)
        navigate('/login')
        return
      }

      // Check if user is PMO Admin
      try {
        const adminCheck = await isPMOAdmin(user.id)
        if (!adminCheck) {
          setError('Only PMO Admin can access this page')
          setLoading(false)
          return
        }
        setIsAdmin(true)
      } catch (adminError) {
        console.error('Error checking admin status:', adminError)
        setError('Unable to verify permissions. Please try again.')
        setLoading(false)
        return
      }
      
      // Load projects
      try {
        const projectsResult = await getAllProjects()
        if (projectsResult.success) {
          setProjects(projectsResult.data || [])
        } else {
          console.error('Failed to load projects:', projectsResult.error)
          setError(projectsResult.error || 'Failed to load projects')
        }
      } catch (projectsError) {
        console.error('Error loading projects:', projectsError)
        setError('Failed to load projects. Please try again.')
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const loadProjectRoles = async (projectId) => {
    try {
      const rolesResult = await getProjectRoles(projectId)
      if (rolesResult.success) {
        setAvailableRoles(rolesResult.data)
      } else {
        setError(rolesResult.error)
      }
    } catch (err) {
      console.error('Error loading project roles:', err)
      setError(err.message || 'Failed to load project roles')
    }
  }

  const handleSendInvite = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSending(true)

    try {
      if (!selectedProject || !email || !selectedRole) {
        setError('Please fill in all required fields')
        setSending(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address')
        setSending(false)
        return
      }

      const result = await sendRoleInvitation(
        selectedProject,
        email,
        selectedRole,
        message || null
      )

      if (result.success) {
        setSuccess(`Invitation sent successfully to ${email}`)
        setEmail('')
        setMessage('')
        setSelectedProject('')
        setSelectedRole('')
        setAvailableRoles([])
      } else {
        setError(result.error || 'Failed to send invitation')
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      setError(err.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  // Always render the page structure immediately - don't wait for data
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-2 sm:gap-3">
            <Mail className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            <span>Send Role Invitations</span>
          </span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
          Send email invitations to users with specific roles. Team Manager and Team Member invitations are reserved for Project Managers.
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Only PMO Admin can access this page'}</p>
            <button
              onClick={() => navigate('/platform/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start sm:items-center">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm sm:text-base text-red-800 dark:text-red-200 break-words">{error}</p>
          </div>
        </div>
      )}

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
          {projects.length === 0 && !error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start sm:items-center">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
                  No projects found. Please ensure you have projects in your organization.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5 md:p-6">
        <form onSubmit={handleSendInvite} className="space-y-4 sm:space-y-5 md:space-y-6">
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
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setSelectedRole('')
              }}
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

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Email Address *</span>
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="user@example.com"
            />
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
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={!selectedProject || availableRoles.length === 0}
              >
                <option value="">
                  {!selectedProject 
                    ? 'Select a project first' 
                    : availableRoles.length === 0 
                    ? 'Loading roles...' 
                    : 'Choose a role...'}
                </option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.role_display_name || role.role_name}
                  </option>
                ))}
              </select>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Note: Team Manager and Team Member roles are not available. These can only be invited by Project Managers.
                      </p>
                    </div>
                  )}

                  {/* Message (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-y"
                      placeholder="Add a personal message to the invitation..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={sending || !selectedProject || !email || !selectedRole}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                    >
                      {sending ? (
                        <>
                          <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('')
                        setMessage('')
                        setSelectedProject('')
                        setSelectedRole('')
                        setAvailableRoles([])
                        setError(null)
                        setSuccess(null)
                      }}
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

