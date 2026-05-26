/**
 * Send Role Invites Page
 *
 * PMO Admin function to send email invitations with roles
 * Excludes Team Manager and Team Member (reserved for Project Managers)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  FolderKanban,
  Shield,
  CheckCircle,
  Loader,
  AlertCircle,
  Send,
  UserPlus,
  Copy,
  ExternalLink,
  Terminal,
  Building2,
} from 'lucide-react'
import {
  getSessionPMOAdminStatus,
  getProjectsPicklistForPMOAdmin,
  getAssignableRolesForPMOAdmin,
  sendRoleInvitation,
} from '../../services/pmoAdminService'
import { platformDb } from '../../services/supabase/supabaseClient'
import {
  useInvitationTemplates,
  invalidateInvitationTemplatesCache,
} from '../../features/invitation-templates/hooks/useInvitationTemplates'
import { resolveInvitationTemplatePlaceholders } from '../../features/invitation-templates/utils/resolveInvitationTemplatePlaceholders'
import {
  clampInvitationExpiryDays,
  fetchAccountInvitationExpiryDays,
  INVITE_EXPIRY_FALLBACK_DAYS,
} from '../../services/invitationExpiryService'
import { loadInvitationProjectContext } from '../../services/invitationProjectContextService'
import {
  personalizeInvitationMessage,
  resolveInviterDisplayNameFromUser,
} from '../../utils/invitationInviteeFormat'
import ManagerAppointmentForm, { MANAGER_APPOINTMENT_EMPTY } from '../../components/pm/ManagerAppointmentForm'
import { isManagerAppointmentRole } from '../../utils/appointmentRoleUtils'
import { createManagerAppointment } from '../../services/managerAppointmentService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
async function fetchInviterFullName(fallbackEmail, userMeta = {}) {
  // SECURITY DEFINER RPC — links auth_user_id and returns profile, bypasses RLS
  try {
    const { data: rows, error: rpcErr } = await platformDb.rpc('get_my_display_name')
    if (rpcErr) console.warn('[SendRoleInvites] get_my_display_name:', rpcErr.message)
    const rawRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    const urow = rawRow ? { ...rawRow, id: rawRow.user_id } : null
    return resolveInviterDisplayNameFromUser(urow || {}, fallbackEmail || '', userMeta) || ''
  } catch (e) {
    console.warn('[SendRoleInvites] fetchInviterFullName error:', e.message)
    return ''
  }
}

export default function SendRoleInvites() {
  const navigate = useNavigate()
  /** Session + PMO gate only — lets the page shell render before projects/roles */
  const [loadingAuth, setLoadingAuth] = useState(true)
  /** Projects + roles (after PMO confirmed) */
  const [listsLoading, setListsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [setupRequired, setSetupRequired] = useState(false)
  const [sqlCopied, setSqlCopied] = useState(false)

  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [email, setEmail] = useState('')
  const [inviteeFirstName, setInviteeFirstName] = useState('')
  const [inviteeLastName, setInviteeLastName] = useState('')
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [authUserId, setAuthUserId] = useState(null)

  const [accountId, setAccountId] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [inviterName, setInviterName] = useState('')
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [pendingResolvedMessage, setPendingResolvedMessage] = useState('')
  const [accountDefaultExpiryDays, setAccountDefaultExpiryDays] = useState(INVITE_EXPIRY_FALLBACK_DAYS)
  /** 'account' = use org default; numeric string = fixed days; 'custom' = use inviteExpiryCustomDays */
  const [inviteExpirySelect, setInviteExpirySelect] = useState('account')
  const [inviteExpiryCustomDays, setInviteExpiryCustomDays] = useState('14')
  const [projectContext, setProjectContext] = useState(null)
  const [projectContextLoading, setProjectContextLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('invitation')
  const [managerAppointmentTerms, setManagerAppointmentTerms] = useState(MANAGER_APPOINTMENT_EMPTY)
  const [reportingCandidates, setReportingCandidates] = useState([])
  const [inviterUserId, setInviterUserId] = useState(null)
  const prevRoleIdRef = useRef('')
  const lastAutoFilledRef = useRef(null)
  const messageRef = useRef('')

  const { getTemplateForRole, templates } = useInvitationTemplates({
    accountId,
    authUserId,
    prefetchEnsure: Boolean(accountId && authUserId),
  })

  useEffect(() => {
    if (!authUserId) return
    platformDb
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInviterUserId(data.id)
          setReportingCandidates([data])
        }
      })
  }, [authUserId])

  const effectiveInviteExpiryDays = useMemo(() => {
    if (inviteExpirySelect === 'custom') {
      return clampInvitationExpiryDays(Number(inviteExpiryCustomDays))
    }
    if (inviteExpirySelect === 'account') {
      return clampInvitationExpiryDays(accountDefaultExpiryDays)
    }
    return clampInvitationExpiryDays(Number(inviteExpirySelect))
  }, [inviteExpirySelect, inviteExpiryCustomDays, accountDefaultExpiryDays])

  useEffect(() => {
    messageRef.current = message
  }, [message])

  useEffect(() => {
    if (!selectedProject) {
      setAccountId(null)
      setProjectName('')
      setOrganisationName('')
      setProjectContext(null)
      setAccountDefaultExpiryDays(INVITE_EXPIRY_FALLBACK_DAYS)
      setInviteExpirySelect('account')
      return
    }
    let cancelled = false
    setProjectContextLoading(true)
    ;(async () => {
      try {
        const [{ data: proj, error: pErr }, ctx] = await Promise.all([
          platformDb
            .from('projects')
            .select(
              'project_name, account_id, accounts(account_display_name, account_name, company_name)',
            )
            .eq('id', selectedProject)
            .maybeSingle(),
          loadInvitationProjectContext(selectedProject),
        ])
        if (cancelled) return
        if (pErr || !proj) {
          setProjectName('')
          setAccountId(null)
          setOrganisationName('')
          setProjectContext(null)
          return
        }
        setProjectName(proj.project_name || '')
        setAccountId(proj.account_id || null)
        if (proj.account_id) invalidateInvitationTemplatesCache(proj.account_id)
        setProjectContext(ctx)
        if (proj.account_id) {
          const er = await fetchAccountInvitationExpiryDays(proj.account_id)
          if (!cancelled) {
            setAccountDefaultExpiryDays(er.days)
          }
        } else if (!cancelled) {
          setAccountDefaultExpiryDays(INVITE_EXPIRY_FALLBACK_DAYS)
        }
        const acc = proj.accounts
        const org =
          (acc && (acc.account_display_name || acc.account_name || acc.company_name)) || ''
        setOrganisationName(org)
      } catch (e) {
        console.error('[SendRoleInvites] project context', e)
        if (!cancelled) setProjectContext(null)
      } finally {
        if (!cancelled) setProjectContextLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedProject])

  useEffect(() => {
    if (!selectedRole) return
    const role = availableRoles.find((r) => r.id === selectedRole)
    if (!role) return

    const tmpl = getTemplateForRole(role.role_name)
    const roleChanged = prevRoleIdRef.current !== selectedRole
    prevRoleIdRef.current = selectedRole

    const ctx = {
      projectName,
      roleDisplayName: role.role_display_name || role.role_name,
      inviterName,
      organisationName,
      invitationExpiryDays: effectiveInviteExpiryDays,
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
    selectedRole,
    availableRoles,
    templates,
    projectName,
    inviterName,
    organisationName,
    effectiveInviteExpiryDays,
    projectContext,
    inviteeFirstName,
    inviteeLastName,
    getTemplateForRole,
  ])

  const selectedRoleRow = availableRoles.find((r) => r.id === selectedRole)
  const isManagerRole = selectedRoleRow ? isManagerAppointmentRole(selectedRoleRow.role_name) : false

  const resetMessageTemplateState = useCallback(() => {
    lastAutoFilledRef.current = null
    prevRoleIdRef.current = ''
    setShowRestorePrompt(false)
    setPendingResolvedMessage('')
  }, [])

  const selectedTemplate = selectedRoleRow ? getTemplateForRole(selectedRoleRow.role_name) : null
  const resolvedDefault =
    selectedTemplate?.message_body && selectedRoleRow
      ? resolveInvitationTemplatePlaceholders(selectedTemplate.message_body, {
          projectName,
          roleDisplayName: selectedRoleRow.role_display_name || selectedRoleRow.role_name,
          inviterName,
          organisationName,
          invitationExpiryDays: effectiveInviteExpiryDays,
          inviteeFirstName,
          inviteeLastName,
        }).trim()
      : ''
  const usingDefault =
    !!selectedTemplate &&
    !!resolvedDefault &&
    message.trim() === resolvedDefault

  const applyResetToDefault = () => {
    if (!selectedRoleRow || !selectedTemplate?.message_body) return
    const ctx = {
      projectName,
      roleDisplayName: selectedRoleRow.role_display_name || selectedRoleRow.role_name,
      inviterName,
      organisationName,
      invitationExpiryDays: effectiveInviteExpiryDays,
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

  const checkAccessAndLoadData = useCallback(async () => {
    try {
      setLoadingAuth(true)
      setListsLoading(false)
      setError(null)

      const { user, isPMOAdmin: adminOk, authError } = await getSessionPMOAdminStatus()

      if (authError || !user) {
        console.error('Auth error:', authError)
        setError('Please log in to access this page')
        setLoadingAuth(false)
        navigate('/login')
        return
      }

      if (!adminOk) {
        setError('Only PMO Admin can access this page')
        setLoadingAuth(false)
        return
      }

      setIsAdmin(true)
      setAuthUserId(user.id)
      setLoadingAuth(false)
      setListsLoading(true)

      const [projectsResult, rolesResult, inviterNameResolved] = await Promise.all([
        getProjectsPicklistForPMOAdmin(),
        getAssignableRolesForPMOAdmin(),
        fetchInviterFullName(user.email, user.user_metadata || {}),
      ])

      setInviterName(inviterNameResolved)

      if (!projectsResult.success) {
        setError(projectsResult.error || 'Failed to load projects')
      } else {
        setProjects(projectsResult.data || [])
      }

      if (!rolesResult.success) {
        setError((prev) => prev || rolesResult.error || 'Failed to load roles')
      } else {
        setAvailableRoles(rolesResult.data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setListsLoading(false)
      setLoadingAuth(false)
    }
  }, [navigate])

  useEffect(() => {
    checkAccessAndLoadData().catch((err) => {
      console.error('[SendRoleInvites] Unhandled error in checkAccessAndLoadData:', err)
      setError('Failed to initialize page. Please refresh.')
      setListsLoading(false)
      setLoadingAuth(false)
    })
  }, [checkAccessAndLoadData])

  const formDisabled = listsLoading || sending || projectContextLoading

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

      const firstTrim = inviteeFirstName.trim()
      const lastTrim = inviteeLastName.trim()
      if (!firstTrim || !lastTrim) {
        setError('Please enter the invitee first name and surname')
        setSending(false)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address')
        setSending(false)
        return
      }

      // Always send resolved days from the form (useMemo). Omitting this forced a second RPC
      // (get_default_project_invitation_expiry_days) inside inviteUserToProject; that extra hop
      // could fail under RLS or stall the request while the UI stayed on "Sending…".
      // Page already verified PMO admin; skip duplicate RPC on submit.
      // Email dispatch runs in background after the invite row is saved (see invitationService).
      const messageToSend = personalizeInvitationMessage(message || null, {
        inviteeFirstName: firstTrim,
        inviteeLastName: lastTrim,
      })

      const reportingToName = managerAppointmentTerms.reportingToUserId
        ? (reportingCandidates.find((u) => u.id === managerAppointmentTerms.reportingToUserId)?.full_name || '')
        : ''

      const result = await Promise.race([
        sendRoleInvitation(
          selectedProject,
          email,
          selectedRole,
          messageToSend || null,
          effectiveInviteExpiryDays,
          {
            skipPmoRecheck: true,
            projectContext,
            organisationName,
            inviteeFirstName: firstTrim,
            inviteeLastName: lastTrim,
            appointmentTerms: isManagerRole
              ? { ...managerAppointmentTerms, reportingToName }
              : null,
          },
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timed out. The server is taking too long — please try again.')),
            45_000,
          ),
        ),
      ])

      if (result.success) {
        if (isManagerRole && result.data?.id) {
          const { data: inviteeUser } = await platformDb
            .from('users')
            .select('id')
            .ilike('email', email.trim())
            .maybeSingle()
          if (inviteeUser?.id) {
            await createManagerAppointment({
              entityType: 'project',
              projectId: selectedProject,
              appointeeUserId: inviteeUser.id,
              managerRoleName: selectedRoleRow?.role_name,
              invitationId: result.data.id,
              reportingToUserId: managerAppointmentTerms.reportingToUserId || inviterUserId,
              assignmentStartDate: managerAppointmentTerms.assignmentStartDate || null,
              assignmentEndDate: managerAppointmentTerms.assignmentEndDate || null,
              timeCommitmentPct: managerAppointmentTerms.timeCommitmentPct,
              budgetAuthorityLimit: managerAppointmentTerms.budgetAuthorityLimit,
              authorityNotes: managerAppointmentTerms.authorityNotes,
              reportingFrequency: managerAppointmentTerms.reportingFrequency,
              knownConstraints: managerAppointmentTerms.knownConstraints,
              referenceDocument: managerAppointmentTerms.referenceDocument,
              appointmentMessage: managerAppointmentTerms.appointmentMessage || messageToSend,
            })
          }
        }
        setSuccess(`Invitation sent successfully to ${firstTrim} ${lastTrim} (${email})`)
        setEmail('')
        setInviteeFirstName('')
        setInviteeLastName('')
        setMessage('')
        resetMessageTemplateState()
        setSelectedProject('')
        setSelectedRole('')
        setInviteExpirySelect('account')
        setManagerAppointmentTerms(MANAGER_APPOINTMENT_EMPTY)
        setActiveTab('invitation')
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

  const handleClear = useCallback(() => {
    setEmail('')
    setInviteeFirstName('')
    setInviteeLastName('')
    setMessage('')
    resetMessageTemplateState()
    setInviteExpirySelect('account')
    setSelectedProject('')
    setSelectedRole('')
    setError(null)
    setSuccess(null)
    setManagerAppointmentTerms(MANAGER_APPOINTMENT_EMPTY)
    setActiveTab('invitation')
  }, [resetMessageTemplateState])

  const roleSelectDisabled = !selectedProject || availableRoles.length === 0

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

      {loadingAuth && (
        <div className="flex items-center justify-center min-h-[28vh] sm:min-h-[32vh]">
          <div className="text-center">
            <Loader className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Checking access…
            </p>
          </div>
        </div>
      )}

      {!loadingAuth && !isAdmin && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Only PMO Admin can access this page'}</p>
            <button
              type="button"
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

      {!loadingAuth && isAdmin && listsLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 sm:p-10 flex flex-col items-center justify-center gap-3 min-h-[200px]">
          <Loader className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Loading projects and roles…
          </p>
        </div>
      )}

      {!loadingAuth && isAdmin && !listsLoading && (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                      setMessage('')
                      setInviteExpirySelect('account')
                      resetMessageTemplateState()
                    }}
                    required
                    disabled={formDisabled}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                  >
                    <option value="">Choose a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_name} ({project.project_code || 'No code'})
                      </option>
                    ))}
                  </select>
                </div>
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
                    disabled={formDisabled || roleSelectDisabled}
                  >
                    <option value="">
                      {!selectedProject
                        ? 'Select a project first'
                        : availableRoles.length === 0
                          ? 'No roles available'
                          : 'Choose a role...'}
                    </option>
                    {availableRoles.map((role, index) => (
                      <option key={role.id} value={role.id}>
                        {role.role_display_name || role.role_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Team Manager and Team Member are reserved for Project Managers.
                  </p>
                </div>
              </div>

              {/* Organisation field — read-only, derived from selected project */}
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      Organisation / Company
                    </span>
                  </label>
                  <div className="w-full px-3 sm:px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {organisationName ? (
                      <>
                        <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="font-medium">{organisationName}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">No organisation on file for this project</span>
                    )}
                  </div>
                  {organisationName && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      The invitee will be associated with this organisation upon acceptance.
                    </p>
                  )}
                </div>
              )}

              {/* Tab bar — always visible */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[
                  { key: 'invitation', label: 'Invitation Details' },
                  { key: 'appointment', label: 'Appointment Terms' },
                ].map((t, index) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Invitation Details tab content */}
              {activeTab === 'invitation' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center">
                          <UserPlus className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Invitee first name *</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={inviteeFirstName}
                        onChange={(e) => setInviteeFirstName(e.target.value)}
                        disabled={formDisabled}
                        autoComplete="given-name"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span>Invitee surname *</span>
                      </label>
                      <input
                        type="text"
                        value={inviteeLastName}
                        onChange={(e) => setInviteeLastName(e.target.value)}
                        disabled={formDisabled}
                        autoComplete="family-name"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                        placeholder="Surname"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Email address *</span>
                        </span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={formDisabled}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Invitation expires after
                      </label>
                      <select
                        value={inviteExpirySelect}
                        onChange={(e) => setInviteExpirySelect(e.target.value)}
                        disabled={formDisabled}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                      >
                        <option value="account">
                          Organisation default ({accountDefaultExpiryDays} day
                          {accountDefaultExpiryDays === 1 ? '' : 's'})
                        </option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="21">21 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="custom">Custom…</option>
                      </select>
                      {inviteExpirySelect === 'custom' && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={inviteExpiryCustomDays}
                            onChange={(e) => setInviteExpiryCustomDays(e.target.value)}
                            disabled={formDisabled}
                            className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">days (1–365)</span>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Org default: People → Invitation expiry in the PMO menu.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      disabled={formDisabled}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-y disabled:opacity-60"
                      placeholder="Add a personal message to the invitation..."
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
                          disabled={formDisabled}
                          onClick={applyResetToDefault}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
                        >
                          Reset to default
                        </button>
                      )}
                      {showRestorePrompt && pendingResolvedMessage && (
                        <button
                          type="button"
                          disabled={formDisabled}
                          onClick={() => {
                            setMessage(pendingResolvedMessage)
                            lastAutoFilledRef.current = pendingResolvedMessage
                            setShowRestorePrompt(false)
                            setPendingResolvedMessage('')
                          }}
                          className="text-amber-700 dark:text-amber-300 hover:underline font-medium disabled:opacity-50"
                        >
                          Role changed — restore default?
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Appointment Terms tab content */}
              {activeTab === 'appointment' && (
                <ManagerAppointmentForm
                  value={managerAppointmentTerms}
                  onChange={setManagerAppointmentTerms}
                  eligibleUsers={reportingCandidates}
                  storageKey={`nidus-mgr-appt-send-${selectedProject}`}
                />
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    formDisabled ||
                    sending ||
                    !selectedProject ||
                    !email ||
                    !selectedRole ||
                    !inviteeFirstName.trim() ||
                    !inviteeLastName.trim()
                  }
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
                  onClick={handleClear}
                  disabled={formDisabled}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium disabled:opacity-50"
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
