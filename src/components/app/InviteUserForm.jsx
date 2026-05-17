/**
 * Invite User — inline form (not a modal)
 */

import { useState, useEffect, useRef } from 'react'
import { Mail, User, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { inviteUserToProject, pmoAddExistingUserToProject } from '../../services/projectMembershipService'
import { dispatchProjectInvitationEmail } from '../../services/invitationService'
import { checkSeatAvailability } from '../../services/seatManagementService'
import {
  getProjectManagerAssignableRoles,
  getPmoMembershipAssignableRoles,
} from '../../services/projectRoleAssignmentService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useInvitationTemplates } from '../../features/invitation-templates/hooks/useInvitationTemplates'
import { resolveInvitationTemplatePlaceholders } from '../../features/invitation-templates/utils/resolveInvitationTemplatePlaceholders'
import { normalizeInvitationMessageOrganisation } from '../../utils/invitationMessageEmailFormat'
import {
  clampInvitationExpiryDays,
  fetchDefaultInvitationExpiryDaysForProject,
} from '../../services/invitationExpiryService'
import { loadInvitationProjectContext } from '../../services/invitationProjectContextService'

const MODE_INVITE = 'invite'
const MODE_DIRECT = 'direct'

export default function InviteUserForm({
  projectId,
  onSuccess,
  onCancel,
  allowLeadershipRoles = false,
  permissionNote = null,
  defaultRole = null,  // role_name string to pre-select (e.g. 'team_manager')
}) {
  const [pmoMode, setPmoMode] = useState(MODE_INVITE)
  const [loading, setLoading] = useState(false)
  const [checkingSeats, setCheckingSeats] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [message, setMessage] = useState('')
  const [roles, setRoles] = useState([])
  const [seatInfo, setSeatInfo] = useState(null)
  const [error, setError] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [inviterName, setInviterName] = useState('')
  const [invitationExpiryDays, setInvitationExpiryDays] = useState(7)
  const [accountId, setAccountId] = useState(null)
  const [projectContext, setProjectContext] = useState(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [pendingResolvedMessage, setPendingResolvedMessage] = useState('')
  const prevRoleIdRef = useRef('')
  const lastAutoFilledRef = useRef(null)
  const messageRef = useRef('')

  const { getTemplateForRole, templates } = useInvitationTemplates({ accountId })

  useEffect(() => {
    messageRef.current = message
  }, [message])

  useEffect(() => {
    const org = organisationName?.trim()
    if (!org) return
    const cur = messageRef.current
    if (!cur || !/\bour organisation\b/i.test(cur)) return
    const updated = normalizeInvitationMessageOrganisation(cur, org)
    if (updated !== cur) {
      setMessage(updated)
      lastAutoFilledRef.current = updated
    }
  }, [organisationName])

  useEffect(() => {
    if (!projectId) return
    setEmail('')
    setRoleId('')
    setMessage('')
    setError(null)
    setShowRestorePrompt(false)
    setPendingResolvedMessage('')
    lastAutoFilledRef.current = null
    prevRoleIdRef.current = ''
    if (!allowLeadershipRoles) setPmoMode(MODE_INVITE)
    loadRoles()
    checkSeats()
  }, [projectId, allowLeadershipRoles])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: proj, error: pErr } = await platformDb
          .from('projects')
          .select(
            'project_name, project_code, account_id, accounts(account_display_name, account_name, company_name)',
          )
          .eq('id', projectId)
          .maybeSingle()
        if (cancelled) return
        if (pErr || !proj) {
          setProjectName('')
          setAccountId(null)
          setOrganisationName('')
          return
        }
        setProjectName(proj.project_name || '')
        setProjectCode(proj.project_code?.trim() || '')
        setAccountId(proj.account_id || null)
        const acc = proj.accounts
        const org =
          (acc && (acc.account_display_name || acc.account_name || acc.company_name)) || ''
        setOrganisationName(org)
      } catch (e) {
        console.error('InviteUserForm project context', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const res = await fetchDefaultInvitationExpiryDaysForProject(projectId)
      if (!cancelled) setInvitationExpiryDays(res.days)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setProjectContext(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const ctx = await loadInvitationProjectContext(projectId)
      if (!cancelled) setProjectContext(ctx)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user?.id || cancelled) return
        const { data: urow } = await platformDb
          .from('users')
          .select('full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (!cancelled) setInviterName(urow?.full_name || user.email || '')
      } catch (e) {
        console.error('InviteUserForm inviter', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const loadRoles = async () => {
    try {
      const result = allowLeadershipRoles
        ? await getPmoMembershipAssignableRoles()
        : await getProjectManagerAssignableRoles()
      if (result.success) {
        setRoles(result.data || [])
        if (result.data && result.data.length > 0) {
          const preselected = defaultRole
            ? result.data.find((r) => r.role_name === defaultRole)
            : null
          const preferred = preselected || (allowLeadershipRoles
            ? result.data.find((r) => r.role_name === 'project_manager')
            : result.data.find((r) => r.role_name === 'team_member'))
          setRoleId(preferred ? preferred.id : result.data[0].id)
        }
      }
    } catch (e) {
      console.error('Error loading roles:', e)
    }
  }

  useEffect(() => {
    if (pmoMode !== MODE_INVITE) {
      setShowRestorePrompt(false)
      return
    }
    const role = roles.find((r) => r.id === roleId)
    if (!role || !roleId) return

    const tmpl = getTemplateForRole(role.role_name)
    const roleChanged = prevRoleIdRef.current !== roleId
    prevRoleIdRef.current = roleId

    const ctx = {
      projectName,
      roleDisplayName: role.role_display_name || role.role_name,
      inviterName,
      organisationName,
      invitationExpiryDays,
      projectContext,
    }

    if (!tmpl?.message_body) {
      if (roleChanged) setShowRestorePrompt(false)
      return
    }

    const resolved = resolveInvitationTemplatePlaceholders(tmpl.message_body, ctx)
    const cur = messageRef.current.trim()
    const last = (lastAutoFilledRef.current || '').trim()

    if (!roleChanged) {
      if (cur === '' && lastAutoFilledRef.current === null) {
        setMessage(resolved)
        lastAutoFilledRef.current = resolved
      }
      return
    }

    if (cur === '' || cur === last) {
      setMessage(resolved)
      lastAutoFilledRef.current = resolved
      setShowRestorePrompt(false)
      setPendingResolvedMessage('')
    } else {
      setPendingResolvedMessage(resolved)
      setShowRestorePrompt(true)
    }
  }, [
    roleId,
    roles,
    templates,
    pmoMode,
    projectName,
    inviterName,
    organisationName,
    invitationExpiryDays,
    projectContext,
    getTemplateForRole,
  ])

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
      const useDirect = allowLeadershipRoles && pmoMode === MODE_DIRECT
      const result = useDirect
        ? await pmoAddExistingUserToProject(projectId, email, roleId)
        : await inviteUserToProject(projectId, {
            email,
            roleId,
            message: message || null,
            expiryDays: clampInvitationExpiryDays(invitationExpiryDays),
          })

      if (result.success) {
        if (!useDirect && result.data?.invitation_token) {
          const role = roles.find((r) => r.id === roleId)
          void dispatchProjectInvitationEmail(email, {
            projectId,
            projectCode,
            projectName,
            roleName: role?.role_display_name || role?.role_name || 'team member',
            inviterName,
            organisationName,
            message: message || null,
            expiryDays: clampInvitationExpiryDays(invitationExpiryDays),
            invitationToken: result.data.invitation_token,
            projectContext,
          }).catch((err) => {
            console.warn('[InviteUserForm] Email dispatch failed:', err?.message)
          })
        }
        onSuccess?.({ mode: useDirect ? MODE_DIRECT : MODE_INVITE })
      } else {
        if (result.code === 'SEAT_LIMIT_EXCEEDED') {
          setError('Seat limit exceeded. Please purchase additional seats.')
          setSeatInfo(result.seatInfo)
        } else {
          setError(result.error || (useDirect ? 'Failed to add member' : 'Failed to send invitation'))
        }
      }
    } catch (err) {
      console.error('Error submitting member form:', err)
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return null

  const selectedRole = roles.find((r) => r.id === roleId)
  const selectedTemplate = selectedRole ? getTemplateForRole(selectedRole.role_name) : null
  const resolvedDefault = selectedTemplate?.message_body
    ? resolveInvitationTemplatePlaceholders(selectedTemplate.message_body, {
        projectName,
        roleDisplayName: selectedRole?.role_display_name || selectedRole?.role_name,
        inviterName,
        organisationName,
        invitationExpiryDays,
        projectContext,
      }).trim()
    : ''
  const usingDefault =
    pmoMode === MODE_INVITE &&
    selectedTemplate &&
    resolvedDefault &&
    message.trim() === resolvedDefault

  const applyResetToDefault = () => {
    if (!selectedRole || !selectedTemplate?.message_body) return
    const ctx = {
      projectName,
      roleDisplayName: selectedRole.role_display_name || selectedRole.role_name,
      inviterName,
      organisationName,
      invitationExpiryDays,
      projectContext,
    }
    const resolved = resolveInvitationTemplatePlaceholders(selectedTemplate.message_body, ctx)
    setMessage(resolved)
    lastAutoFilledRef.current = resolved
    setShowRestorePrompt(false)
    setPendingResolvedMessage('')
  }

  const usagePercentage = seatInfo
    ? Math.round((seatInfo.current_count / seatInfo.total_seats) * 100)
    : 0
  const isNearLimit = usagePercentage >= 80
  const isAtLimit = usagePercentage >= 100

  return (
    <section
      id="add-project-member"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6"
      aria-labelledby="invite-user-heading"
    >
      {permissionNote && (
        <div
          className="mb-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          {permissionNote}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h2 id="invite-user-heading" className="text-xl font-bold text-gray-900 dark:text-white">
            Add project member
          </h2>
          {!allowLeadershipRoles && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Creates a pending invitation — they join when they accept the email.
            </p>
          )}
          {allowLeadershipRoles && (
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Member onboarding mode">
              <button
                type="button"
                role="tab"
                aria-selected={pmoMode === MODE_INVITE}
                onClick={() => {
                  setPmoMode(MODE_INVITE)
                  setError(null)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  pmoMode === MODE_INVITE
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                Invite by email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pmoMode === MODE_DIRECT}
                onClick={() => {
                  setPmoMode(MODE_DIRECT)
                  setError(null)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  pmoMode === MODE_DIRECT
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                Add existing user now
              </button>
            </div>
          )}
          {allowLeadershipRoles && (
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mt-2">
              {pmoMode === MODE_DIRECT
                ? 'Adds an active platform account to this project immediately (no email invite). The person must already exist in Users.'
                : 'Send an invitation email. PMO can assign governance roles (sponsor / executive, programme manager, project manager, assurance, delivery team).'}
            </p>
          )}
        </div>
        {typeof onCancel === 'function' ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shrink-0"
          >
            Close
          </button>
        ) : null}
      </div>

      {seatInfo && pmoMode === MODE_INVITE && (
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
              onChange={(e) => {
                setRoleId(e.target.value)
              }}
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

        {pmoMode === MODE_INVITE && (
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
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span
                className={
                  usingDefault
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-400'
                }
              >
                {usingDefault ? 'Using default template' : 'Custom message'}
              </span>
              {selectedTemplate?.message_body && (
                <button
                  type="button"
                  onClick={applyResetToDefault}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Reset to default
                </button>
              )}
              {showRestorePrompt && pendingResolvedMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setMessage(pendingResolvedMessage)
                    lastAutoFilledRef.current = pendingResolvedMessage
                    setShowRestorePrompt(false)
                    setPendingResolvedMessage('')
                  }}
                  className="text-amber-700 dark:text-amber-300 hover:underline font-medium"
                >
                  Role changed — restore default?
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {typeof onCancel === 'function' ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={
              loading ||
              checkingSeats ||
              (pmoMode === MODE_INVITE && isAtLimit)
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                {pmoMode === MODE_DIRECT ? 'Adding…' : 'Sending…'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {pmoMode === MODE_DIRECT ? 'Add to project' : 'Send invitation'}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
