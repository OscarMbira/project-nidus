/**
 * Invite User — inline form (not a modal)
 */

import { useState, useEffect, useRef } from 'react'
import { Mail, User, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import {
  inviteUserToProject,
  pmoAddExistingUserToProject,
  resolveInvitationRoleIdForInsert,
} from '../../services/projectMembershipService'
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
  personalizeInvitationMessage,
  resolveInviterDisplayNameFromUser,
} from '../../utils/invitationInviteeFormat'
import {
  clampInvitationExpiryDays,
  fetchDefaultInvitationExpiryDaysForProject,
} from '../../services/invitationExpiryService'
import { loadInvitationProjectContext } from '../../services/invitationProjectContextService'
import { INVITE_HARD_LIMIT_MS } from '../../services/inviteTransport'
import TeamMemberAppointmentForm, { TEAM_MEMBER_APPOINTMENT_EMPTY } from '../pm/TeamMemberAppointmentForm'
import { createTeamMemberAppointment } from '../../services/teamMemberAppointmentService'
import { isTeamMemberAppointmentRole, isManagerAppointmentRole } from '../../utils/appointmentRoleUtils'
import ManagerAppointmentForm, { MANAGER_APPOINTMENT_EMPTY } from '../pm/ManagerAppointmentForm'
import { createManagerAppointment } from '../../services/managerAppointmentService'

const MODE_INVITE = 'invite'
const INVITE_UI_FAILSAFE_MS = INVITE_HARD_LIMIT_MS + 4_000
const MODE_DIRECT = 'direct'
const INTERNAL_USER_CACHE_PREFIX = 'nidus-internal-user-id'

export default function InviteUserForm({
  projectId,
  onSuccess,
  onCancel,
  allowLeadershipRoles = false,
  callerIsPmoAdmin = false,
  permissionNote = null,
  defaultRole = null,  // role_name string to pre-select (e.g. 'team_manager')
}) {
  const [pmoMode, setPmoMode] = useState(MODE_INVITE)
  const [loading, setLoading] = useState(false)
  const [checkingSeats, setCheckingSeats] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteeFirstName, setInviteeFirstName] = useState('')
  const [inviteeLastName, setInviteeLastName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [message, setMessage] = useState('')
  const [roles, setRoles] = useState([])
  const [seatInfo, setSeatInfo] = useState(null)
  const [error, setError] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [inviterName, setInviterName] = useState('')
  const [inviterJobTitle, setInviterJobTitle] = useState('')
  const [invitationExpiryDays, setInvitationExpiryDays] = useState(7)
  const [accountId, setAccountId] = useState(null)
  const [authUserId, setAuthUserId] = useState(null)
  const [projectContext, setProjectContext] = useState(null)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [pendingResolvedMessage, setPendingResolvedMessage] = useState('')
  const prevRoleIdRef = useRef('')
  const lastAutoFilledRef = useRef(null)
  const messageRef = useRef('')
  const inviterUserIdRef = useRef(null)
  const prefetchedInvitationRoleIdRef = useRef(null)
  const [teamAppointmentTerms, setTeamAppointmentTerms] = useState(TEAM_MEMBER_APPOINTMENT_EMPTY)
  const [managerAppointmentTerms, setManagerAppointmentTerms] = useState(MANAGER_APPOINTMENT_EMPTY)
  const [reportingCandidates, setReportingCandidates] = useState([])
  const [inviterInternalUserId, setInviterInternalUserId] = useState(null)

  const { getTemplateForRole, templates } = useInvitationTemplates({
    accountId,
    authUserId,
    prefetchEnsure: callerIsPmoAdmin && Boolean(accountId && authUserId),
  })

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
    setInviteeFirstName('')
    setInviteeLastName('')
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
    setTeamAppointmentTerms(TEAM_MEMBER_APPOINTMENT_EMPTY)
    setManagerAppointmentTerms(MANAGER_APPOINTMENT_EMPTY)
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

        // Try embedded join first; fall back to a direct accounts query if PostgREST join returns nothing
        let org = ''
        const acc = proj.accounts
        org = (acc && (acc.account_display_name || acc.account_name || acc.company_name)) || ''
        if (!org && proj.account_id) {
          const { data: accRow } = await platformDb
            .from('accounts')
            .select('account_display_name, account_name, company_name')
            .eq('id', proj.account_id)
            .maybeSingle()
          org = (accRow && (accRow.account_display_name || accRow.account_name || accRow.company_name)) || ''
        }
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
        const { data: { session } } = await platformDb.auth.getSession()
        const authId = session?.user?.id
        if (!authId || cancelled) return
        setAuthUserId(authId)

        // Use SECURITY DEFINER RPC — links auth_user_id and returns profile, bypassing RLS
        const { data: rows, error: rpcErr } = await platformDb.rpc('get_my_display_name')
        if (rpcErr) console.warn('[InviteUserForm] get_my_display_name:', rpcErr.message)

        const rawRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
        // Normalise: RPC returns user_id, components expect id
        const urow = rawRow ? { ...rawRow, id: rawRow.user_id } : null

        if (cancelled) return

        if (urow?.id) {
          inviterUserIdRef.current = urow.id
          try {
            sessionStorage.setItem(`${INTERNAL_USER_CACHE_PREFIX}:${authId}`, urow.id)
          } catch {
            /* ignore */
          }
          setInviterInternalUserId(urow.id)
          setReportingCandidates([{ id: urow.id, full_name: urow.full_name, email: urow.email }])
        }

        const meta = session?.user?.user_metadata || {}
        const resolvedName = resolveInviterDisplayNameFromUser(urow || {}, session?.user?.email || '', meta) || 'Your project contact'
        setInviterName(resolvedName)
        setInviterJobTitle(urow?.job_title || '')
        setInviterName(resolvedName)
      } catch (e) {
        console.error('InviteUserForm inviter', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!roleId || pmoMode !== MODE_INVITE) {
      prefetchedInvitationRoleIdRef.current = null
      return
    }
    let cancelled = false
    prefetchedInvitationRoleIdRef.current = null
    resolveInvitationRoleIdForInsert(roleId).then((res) => {
      if (!cancelled && res.success && res.invitationRoleId) {
        prefetchedInvitationRoleIdRef.current = res.invitationRoleId
      }
    })
    return () => {
      cancelled = true
    }
  }, [roleId, pmoMode])

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
      inviteeFirstName,
      inviteeLastName,
    }

    if (!tmpl?.message_body) {
      if (roleChanged) setShowRestorePrompt(false)
      return
    }

    const resolvedBase = resolveInvitationTemplatePlaceholders(tmpl.message_body, ctx)
    const personalized = personalizeInvitationMessage(resolvedBase, {
      inviteeFirstName,
      inviteeLastName,
    }).trim()
    const baseTrim = resolvedBase.trim()
    const cur = messageRef.current.trim()
    const last = (lastAutoFilledRef.current || '').trim()

    if (!roleChanged) {
      if (last && (cur === last || cur === baseTrim)) {
        setMessage(personalized)
        lastAutoFilledRef.current = personalized
      } else if (cur === '' && lastAutoFilledRef.current === null) {
        setMessage(personalized)
        lastAutoFilledRef.current = personalized
      }
      return
    }

    if (cur === '' || cur === last || cur === baseTrim) {
      setMessage(personalized)
      lastAutoFilledRef.current = personalized
      setShowRestorePrompt(false)
      setPendingResolvedMessage('')
    } else {
      setPendingResolvedMessage(personalized)
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
    inviteeFirstName,
    inviteeLastName,
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

    const useDirect = allowLeadershipRoles && pmoMode === MODE_DIRECT

    let messageToSend = message || null
    let firstTrim = ''
    let lastTrim = ''
    if (!useDirect) {
      firstTrim = inviteeFirstName.trim()
      lastTrim = inviteeLastName.trim()
      if (!firstTrim || !lastTrim) {
        setError('Please enter the invitee first name and surname')
        return
      }
      messageToSend = personalizeInvitationMessage(message || null, {
        inviteeFirstName: firstTrim,
        inviteeLastName: lastTrim,
      })
    }

    setLoading(true)
    // Ensure auth_user_id is linked before the invitation RPC permission check
    try { await platformDb.rpc('link_auth_account') } catch { /* ignore */ }
    const failsafe = setTimeout(() => {
      setLoading(false)
      setError((prev) =>
        prev ||
          'Invitation timed out. Run SQL/v597_invite_rpc_pm_permissions_and_names.sql in Supabase, then hard-refresh and retry.',
      )
    }, INVITE_UI_FAILSAFE_MS)
    try {
      const result = useDirect
        ? await pmoAddExistingUserToProject(projectId, email, roleId)
        : await inviteUserToProject(
            projectId,
            {
              email,
              roleId,
              message: messageToSend || null,
              expiryDays: clampInvitationExpiryDays(invitationExpiryDays),
              inviteeFirstName: firstTrim,
              inviteeLastName: lastTrim,
            },
            {
              skipSeatCheck: true,
              invitationRoleId: prefetchedInvitationRoleIdRef.current || undefined,
              inviterUserId: inviterUserIdRef.current || undefined,
              isPmoAdmin: callerIsPmoAdmin,
            },
          )

      if (result.success) {
        const role = roles.find((r) => r.id === roleId)
        if (
          !useDirect &&
          role &&
          isTeamMemberAppointmentRole(role.role_name) &&
          result.data?.id
        ) {
          const { data: inviteeUser } = await platformDb
            .from('users')
            .select('id')
            .ilike('email', email.trim())
            .maybeSingle()
          if (inviteeUser?.id) {
            void createTeamMemberAppointment({
              projectId,
              appointeeUserId: inviteeUser.id,
              roleId,
              memberRoleName: role.role_name,
              invitationId: result.data.id,
              roleTitle: teamAppointmentTerms.roleTitle,
              reportingToUserId: teamAppointmentTerms.reportingToUserId || inviterUserIdRef.current,
              assignmentStartDate: teamAppointmentTerms.assignmentStartDate || null,
              assignmentEndDate: teamAppointmentTerms.assignmentEndDate || null,
              timeCommitmentPct: teamAppointmentTerms.timeCommitmentPct,
              primaryResponsibilities: teamAppointmentTerms.primaryResponsibilities,
              requiredSkills: teamAppointmentTerms.requiredSkills,
              workingArrangement: teamAppointmentTerms.workingArrangement,
              workLocation: teamAppointmentTerms.workLocation,
              appointmentMessage: teamAppointmentTerms.appointmentMessage || messageToSend,
            }).catch((e) => console.warn('[invite] team appt creation failed:', e?.message))
          }
        }
        if (
          !useDirect &&
          role &&
          isManagerAppointmentRole(role.role_name) &&
          result.data?.id
        ) {
          const { data: inviteeUser } = await platformDb
            .from('users')
            .select('id')
            .ilike('email', email.trim())
            .maybeSingle()
          if (inviteeUser?.id) {
            void createManagerAppointment({
              entityType: 'project',
              projectId,
              appointeeUserId: inviteeUser.id,
              managerRoleName: role.role_name,
              invitationId: result.data.id,
              reportingToUserId: managerAppointmentTerms.reportingToUserId || inviterUserIdRef.current,
              assignmentStartDate: managerAppointmentTerms.assignmentStartDate || null,
              assignmentEndDate: managerAppointmentTerms.assignmentEndDate || null,
              timeCommitmentPct: managerAppointmentTerms.timeCommitmentPct,
              budgetAuthorityLimit: managerAppointmentTerms.budgetAuthorityLimit,
              authorityNotes: managerAppointmentTerms.authorityNotes,
              reportingFrequency: managerAppointmentTerms.reportingFrequency,
              knownConstraints: managerAppointmentTerms.knownConstraints,
              referenceDocument: managerAppointmentTerms.referenceDocument,
              appointmentMessage: managerAppointmentTerms.appointmentMessage || messageToSend,
            }).catch((e) => console.warn('[invite] manager appt creation failed:', e?.message))
          }
        }
        if (!useDirect && result.data?.invitation_token) {
          void dispatchProjectInvitationEmail(email, {
            projectId,
            projectCode,
            projectName,
            roleName: role?.role_display_name || role?.role_name || 'team member',
            inviterName,
            inviterJobTitle,
            organisationName,
            message: messageToSend || null,
            expiryDays: clampInvitationExpiryDays(invitationExpiryDays),
            inviteeFirstName: firstTrim || null,
            inviteeLastName: lastTrim || null,
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
      clearTimeout(failsafe)
      setLoading(false)
    }
  }

  if (!projectId) return null

  const selectedRole = roles.find((r) => r.id === roleId)
  const selectedTemplate = selectedRole ? getTemplateForRole(selectedRole.role_name) : null
  const resolvedDefault = selectedTemplate?.message_body
    ? personalizeInvitationMessage(
        resolveInvitationTemplatePlaceholders(selectedTemplate.message_body, {
          projectName,
          roleDisplayName: selectedRole?.role_display_name || selectedRole?.role_name,
          inviterName,
          organisationName,
          invitationExpiryDays,
          projectContext,
          inviteeFirstName,
          inviteeLastName,
        }),
        { inviteeFirstName, inviteeLastName },
      ).trim()
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
      inviteeFirstName,
      inviteeLastName,
    }
    const resolvedBase = resolveInvitationTemplatePlaceholders(selectedTemplate.message_body, ctx)
    const resolved = personalizeInvitationMessage(resolvedBase, {
      inviteeFirstName,
      inviteeLastName,
    }).trim()
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

        {pmoMode === MODE_INVITE && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invitee first name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={inviteeFirstName}
                  onChange={(e) => setInviteeFirstName(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="First name"
                  autoComplete="given-name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invitee surname *
              </label>
              <input
                type="text"
                required
                value={inviteeLastName}
                onChange={(e) => setInviteeLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Surname"
                autoComplete="family-name"
              />
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

        {selectedRole && isTeamMemberAppointmentRole(selectedRole.role_name) && pmoMode === MODE_INVITE ? (
          <TeamMemberAppointmentForm
            value={teamAppointmentTerms}
            onChange={setTeamAppointmentTerms}
            eligibleUsers={reportingCandidates}
            storageKey={`nidus-team-appt-invite-${projectId}`}
            defaultReportingToUserId={inviterInternalUserId}
          />
        ) : null}

        {selectedRole && isManagerAppointmentRole(selectedRole.role_name) && pmoMode === MODE_INVITE ? (
          <ManagerAppointmentForm
            value={managerAppointmentTerms}
            onChange={setManagerAppointmentTerms}
            eligibleUsers={reportingCandidates}
            storageKey={`nidus-mgr-appt-invite-${projectId}`}
            defaultReportingToUserId={inviterInternalUserId}
          />
        ) : null}

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
              (pmoMode === MODE_INVITE &&
                (isAtLimit || !inviteeFirstName.trim() || !inviteeLastName.trim()))
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
