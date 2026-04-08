/**
 * Invite User — inline form (not a modal)
 */

import { useState, useEffect } from 'react'
import { Mail, User, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { inviteUserToProject } from '../../services/projectMembershipService'
import { checkSeatAvailability } from '../../services/seatManagementService'
import { getProjectManagerAssignableRoles } from '../../services/projectRoleAssignmentService'

export default function InviteUserForm({ projectId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [checkingSeats, setCheckingSeats] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [message, setMessage] = useState('')
  const [roles, setRoles] = useState([])
  const [seatInfo, setSeatInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    setEmail('')
    setRoleId('')
    setMessage('')
    setError(null)
    loadRoles()
    checkSeats()
  }, [projectId])

  const loadRoles = async () => {
    try {
      const result = await getProjectManagerAssignableRoles()
      if (result.success) {
        setRoles(result.data || [])
        if (result.data && result.data.length > 0) {
          const teamMember = result.data.find((r) => r.role_name === 'team_member')
          setRoleId(teamMember ? teamMember.id : result.data[0].id)
        }
      }
    } catch (e) {
      console.error('Error loading roles:', e)
    }
  }

  const checkSeats = async () => {
    try {
      setCheckingSeats(true)
      const result = await checkSeatAvailability(projectId)
      if (result.success) {
        setSeatInfo(result.data)
      }
    } catch (e) {
      console.error('Error checking seats:', e)
    } finally {
      setCheckingSeats(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email || !roleId) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const result = await inviteUserToProject(projectId, {
        email,
        roleId,
        message: message || null,
      })

      if (result.success) {
        onSuccess()
      } else {
        if (result.code === 'SEAT_LIMIT_EXCEEDED') {
          setError('Seat limit exceeded. Please purchase additional seats.')
          setSeatInfo(result.seatInfo)
        } else {
          setError(result.error || 'Failed to send invitation')
        }
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      setError(err.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return null

  const usagePercentage = seatInfo
    ? Math.round((seatInfo.current_count / seatInfo.total_seats) * 100)
    : 0
  const isNearLimit = usagePercentage >= 80
  const isAtLimit = usagePercentage >= 100

  return (
    <section
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6"
      aria-labelledby="invite-user-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <h2 id="invite-user-heading" className="text-xl font-bold text-gray-900 dark:text-white">
          Invite user
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shrink-0"
        >
          Close
        </button>
      </div>

      {seatInfo && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            isAtLimit
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : isNearLimit
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-start">
            <AlertCircle
              className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${
                isAtLimit
                  ? 'text-red-600 dark:text-red-400'
                  : isNearLimit
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  isAtLimit
                    ? 'text-red-800 dark:text-red-200'
                    : isNearLimit
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}
              >
                {isAtLimit
                  ? 'Seat limit reached'
                  : isNearLimit
                  ? 'Approaching seat limit'
                  : 'Seat usage'}
              </p>
              <p
                className={`text-xs mt-1 ${
                  isAtLimit
                    ? 'text-red-700 dark:text-red-300'
                    : isNearLimit
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}
              >
                {seatInfo.current_count} / {seatInfo.total_seats} seats used
                {isAtLimit && '. Purchase additional seats to invite more users.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="user@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_display_name || role.role_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder="Add a personal message to the invitation…"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isAtLimit || checkingSeats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Sending…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Send invitation
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
