/**
 * Invitation Accept Page
 * Smart user-detection: authenticated | registered (not logged in) | new user
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { appDb as supabase } from '../../services/supabase/supabaseClient'
import { getInvitationAcceptContext, getInvitationByToken } from '../../services/invitationService'
import { acceptInvitation, declineInvitationByToken } from '../../services/projectMembershipService'
import { getPostLoginRoute } from '../../services/postLoginRouter'
import { normalizeSupabaseAuthError } from '../../utils/authErrorMessage'
import { Lock, Mail, AlertCircle, Loader, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import AuthPublicLayout from '../../components/auth/AuthPublicLayout'
import InvitationDetailsCard, {
  INVITATION_CARD_CLASS,
} from '../../components/invitations/InvitationDetailsCard'
import AppointmentAcceptPanel from '../../components/invitations/AppointmentAcceptPanel'
import {
  getManagerAppointmentByInvitationId,
  acceptManagerAppointment,
  declineManagerAppointment,
} from '../../services/managerAppointmentService'
import {
  getTeamMemberAppointmentByInvitationId,
  acceptTeamMemberAppointment,
  declineTeamMemberAppointment,
} from '../../services/teamMemberAppointmentService'
import {
  isManagerAppointmentRole,
  isTeamMemberAppointmentRole,
} from '../../utils/appointmentRoleUtils'

// ── User detection states ─────────────────────────────────────────────────────
// 'loading'        — RPC/auth check in progress
// 'authenticated'  — user is already signed in (session active)
// 'registered'     — user has an account but is NOT signed in
// 'new'            — email has never been registered
const USER_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  REGISTERED: 'registered',
  NEW: 'new',
}

function InvitationPageWrap({ children, contentClassName }) {
  return (
    <AuthPublicLayout contentClassName={contentClassName} disablePlatformSimulatorButtons>
      {children}
    </AuthPublicLayout>
  )
}

export default function InvitationAccept() {
  const { token: pathToken } = useParams()
  const [searchParams] = useSearchParams()
  const token = pathToken || searchParams.get('token') || ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [invitationId, setInvitationId] = useState(null)

  // Replaces the old boolean isExistingUser
  const [userStatus, setUserStatus] = useState(USER_STATUS.LOADING)

  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [appointmentFlow, setAppointmentFlow] = useState(null)
  const [managerAppointment, setManagerAppointment] = useState(null)
  const [teamAppointment, setTeamAppointment] = useState(null)
  const [acceptanceFields, setAcceptanceFields] = useState({
    availabilityConfirmed: false,
    actualStartDate: '',
    conflictOfInterest: false,
    coiDetail: '',
    capabilityAcknowledged: false,
    skillsAcknowledged: false,
    acceptanceConditions: '',
    initialObservations: '',
  })
  const [declineReason, setDeclineReason] = useState('unavailable')
  const [declineNote, setDeclineNote] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  useEffect(() => {
    if (
      searchParams.get('action') === 'decline' &&
      !loading &&
      invitation &&
      !declined &&
      !declineConfirmOpen
    ) {
      setDeclineConfirmOpen(true)
      setError(null)
    }
  }, [searchParams, loading, invitation, declined, declineConfirmOpen])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Fire-and-forget: link user to the inviting organisation. */
  function _assignOrg(userId, organisationName) {
    if (!userId || !organisationName) return
    void supabase
      .from('users')
      .update({ organization: organisationName, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .then(({ error: e }) => {
        if (e) console.warn('[accept] org assignment skipped:', e.message)
      })
  }

  /** Run all appointment + membership acceptance for an already-authenticated user. */
  async function _acceptAsAuthenticatedUser(userId) {
    if (appointmentFlow === 'manager' && managerAppointment?.id) {
      const res = await acceptManagerAppointment(managerAppointment.id, {
        availabilityConfirmed: acceptanceFields.availabilityConfirmed,
        actualStartDate: acceptanceFields.actualStartDate || null,
        conflictOfInterest: acceptanceFields.conflictOfInterest,
        coiDetail: acceptanceFields.coiDetail,
        capabilityAcknowledged: acceptanceFields.capabilityAcknowledged,
        acceptanceConditions: acceptanceFields.acceptanceConditions,
        initialObservations: acceptanceFields.initialObservations,
      })
      if (!res.success) throw new Error(res.error)
    } else if (appointmentFlow === 'team' && teamAppointment?.id) {
      const res = await acceptTeamMemberAppointment(teamAppointment.id, {
        availabilityConfirmed: acceptanceFields.availabilityConfirmed,
        actualStartDate: acceptanceFields.actualStartDate || null,
        conflictOfInterest: acceptanceFields.conflictOfInterest,
        coiDetail: acceptanceFields.coiDetail,
        skillsAcknowledged: acceptanceFields.skillsAcknowledged,
        acceptanceConditions: acceptanceFields.acceptanceConditions,
        initialObservations: acceptanceFields.initialObservations,
      })
      if (!res.success) throw new Error(res.error)
    } else {
      // Always call the RPC — the SQL function is idempotent (v619/v621):
      // • pending   → normal acceptance + membership creation
      // • accepted (same user) → repairs missing membership row, returns TRUE
      const res = await acceptInvitation(token, userId)
      if (!res.success) {
        throw new Error(res.error || 'Failed to accept invitation.')
      }
    }
    _assignOrg(userId, invitation?.organisation_name)
  }

  // ── Load invitation ────────────────────────────────────────────────────────

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getInvitationAcceptContext(token)
      if (!result.data) {
        setError(result.error || 'Invalid invitation')
        setLoading(false)
        return
      }

      setInvitation(result.data)
      let invId = result.data?.invitation_id ?? null

      const detail = await getInvitationByToken(token)
      const alreadyDeclined =
        detail.success && detail.data?.invitation_status === 'declined'
      if (detail.success && detail.data?.id) {
        invId = detail.data.id
        if (alreadyDeclined) {
          setDeclined(true)
          setError(null)
        }
      }
      setInvitationId(invId)

      const roleName = result.data?.role_name || ''
      if (invId && isManagerAppointmentRole(roleName)) {
        const apRes = await getManagerAppointmentByInvitationId(invId)
        if (apRes.success && apRes.data) {
          setAppointmentFlow('manager')
          setManagerAppointment(apRes.data)
        }
      } else if (invId && isTeamMemberAppointmentRole(roleName)) {
        const apRes = await getTeamMemberAppointmentByInvitationId(invId)
        if (apRes.success && apRes.data) {
          setAppointmentFlow('team')
          setTeamAppointment(apRes.data)
        }
      } else {
        setAppointmentFlow(null)
        setManagerAppointment(null)
        setTeamAppointment(null)
      }

      if (!result.success && !alreadyDeclined) {
        setError(result.error || 'This invitation is no longer valid')
      }

      // ── Smart user detection ──────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Already signed in — simple accept flow
        setUserStatus(USER_STATUS.AUTHENTICATED)
      } else {
        const invitedEmail = result.data?.invited_email || ''
        let hasAccount = false

        if (invitedEmail) {
          try {
            // SECURITY DEFINER RPC — works even with RLS blocking anon table reads
            const { data: rpcResult } = await supabase.rpc('check_email_has_auth_account', {
              p_email: invitedEmail,
            })
            hasAccount = rpcResult === true
          } catch {
            // RPC not deployed yet — fall back to direct query (may fail silently under RLS)
            const { data: row } = await supabase
              .from('users')
              .select('id')
              .eq('email', invitedEmail)
              .maybeSingle()
            hasAccount = !!row
          }
        }

        setUserStatus(hasAccount ? USER_STATUS.REGISTERED : USER_STATUS.NEW)
      }
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  // ── Decline ────────────────────────────────────────────────────────────────

  const handleConfirmDecline = async () => {
    setError(null)
    setDeclining(true)
    try {
      if (appointmentFlow === 'manager' && managerAppointment?.id) {
        const res = await declineManagerAppointment(managerAppointment.id, declineReason, declineNote)
        if (!res.success) { setError(res.error || 'Failed to decline appointment'); return }
      } else if (appointmentFlow === 'team' && teamAppointment?.id) {
        const res = await declineTeamMemberAppointment(teamAppointment.id, declineReason, declineNote)
        if (!res.success) { setError(res.error || 'Failed to decline assignment'); return }
      } else {
        const res = await declineInvitationByToken(token)
        if (!res.success) { setError(res.error || 'Failed to decline invitation'); return }
      }
      setDeclined(true)
      setDeclineConfirmOpen(false)
    } catch (err) {
      setError(normalizeSupabaseAuthError(err, 'Failed to decline invitation.'))
    } finally {
      setDeclining(false)
    }
  }

  // ── Accept: already authenticated ─────────────────────────────────────────

  const handleAcceptAuthenticated = async (e) => {
    e.preventDefault()
    setError(null)
    setAccepting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Session expired — please log in again.'); return }

      let { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!userData) {
        // auth_user_id not linked yet — repair via SECURITY DEFINER RPC, then retry
        await supabase.rpc('link_auth_account')
        const { data: retried } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        userData = retried
      }
      if (!userData) throw new Error('User record not found')

      await _acceptAsAuthenticatedUser(userData.id)
      const { route } = await getPostLoginRoute(user.id)
      navigate(route, { replace: true })
    } catch (err) {
      setError(normalizeSupabaseAuthError(err, 'Failed to accept invitation.'))
    } finally {
      setAccepting(false)
    }
  }

  // ── Accept: registered but not logged in — sign in then accept ─────────────

  const handleSignInAndAccept = async (e) => {
    e.preventDefault()
    setError(null)

    if (!password) { setError('Please enter your password.'); return }

    setAccepting(true)
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.invited_email,
        password,
      })
      if (signInError) {
        // Give a clear hint without exposing auth internals
        throw new Error(
          signInError.message?.toLowerCase().includes('invalid')
            ? 'Incorrect password. Please try again or use "Forgot password" below.'
            : normalizeSupabaseAuthError(signInError, 'Sign-in failed — please try again.'),
        )
      }

      // Link auth_user_id via SECURITY DEFINER RPC (client UPDATE is blocked by RLS)
      await supabase.rpc('link_auth_account')

      // Primary lookup: by auth_user_id (now set by link_auth_account)
      let { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', signInData.user.id)
        .maybeSingle()

      // Email fallback: safety net if link_auth_account couldn't match (edge case)
      if (!userData) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', invitation.invited_email)
          .maybeSingle()
        userData = byEmail
      }

      if (!userData) throw new Error('User profile not found. Please contact your administrator.')

      await _acceptAsAuthenticatedUser(userData.id)
      const { route } = await getPostLoginRoute(signInData.user.id)
      navigate(route, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.')
    } finally {
      setAccepting(false)
    }
  }

  // ── Accept: new user — Edge Function creates account + accepts ─────────────

  const handleCreateAndAccept = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setAccepting(true)
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'accept-invitation',
        {
          body: {
            invitation_token: token,
            password,
            email: invitation.invited_email,
            project_id: invitation.project_id ?? null,
          },
        },
      )

      let fnBody = fnData
      if (fnError?.context?.json) {
        try { fnBody = await fnError.context.json() } catch (_) {}
      } else if (fnError?.context?.text) {
        try {
          const t = await fnError.context.text()
          try { fnBody = JSON.parse(t) } catch (_) { fnBody = { error: t } }
        } catch (_) {}
      }

      if (fnError || !fnBody?.success) {
        const code = fnBody?.code || ''
        const msg = fnBody?.error || fnError?.message || 'Failed to create account'
        if (code === 'SEAT_LIMIT_EXCEEDED' || msg.includes('No available seats')) {
          throw new Error('No available seats in this project')
        }
        throw new Error(msg)
      }

      if (fnBody.session?.access_token) {
        await supabase.auth.setSession({
          access_token: fnBody.session.access_token,
          refresh_token: fnBody.session.refresh_token,
        })
        // Fire-and-forget org assignment for new user
        void (async () => {
          try {
            const orgName = invitation.organisation_name || ''
            if (!orgName) return
            const { data: { user: newUser } } = await supabase.auth.getUser()
            if (!newUser) return
            const { data: uRow } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', newUser.id)
              .maybeSingle()
            if (uRow?.id) {
              await supabase
                .from('users')
                .update({ organization: orgName, updated_at: new Date().toISOString() })
                .eq('id', uRow.id)
            }
          } catch (orgErr) {
            console.warn('[accept] org assignment skipped:', orgErr?.message)
          }
        })()
        const { data: { user: sessionUser } } = await supabase.auth.getUser()
        const { route } = sessionUser
          ? await getPostLoginRoute(sessionUser.id)
          : { route: '/platform/dashboard' }
        navigate(route, { replace: true })
      } else {
        navigate('/login?notice=account-created', { replace: true })
      }
    } catch (err) {
      setError(normalizeSupabaseAuthError(err, 'Failed to accept invitation.'))
    } finally {
      setAccepting(false)
    }
  }

  // ── Decline trigger ────────────────────────────────────────────────────────

  const openDecline = () => { setDeclineConfirmOpen(true); setError(null) }
  const cancelDecline = () => { setDeclineConfirmOpen(false); setError(null) }

  // ── Early returns ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <InvitationPageWrap contentClassName="flex flex-1 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" aria-label="Loading invitation" />
      </InvitationPageWrap>
    )
  }

  if (error && !invitation) {
    return (
      <InvitationPageWrap>
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link to="/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </InvitationPageWrap>
    )
  }

  if (declined) {
    return (
      <InvitationPageWrap>
        <div className="w-full max-w-6xl space-y-6">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden />
              </div>
            </div>
            <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Invitation declined
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              You have declined this project invitation. Your account was not added to the project.
            </p>
          </div>

          {invitation ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
              <InvitationDetailsCard invitation={invitation} />
              <div className={`${INVITATION_CARD_CLASS} flex flex-col`}>
                <div className="px-6 py-8 flex-1 flex flex-col justify-center text-center space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What happens next</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No further action is required. If this was a mistake, contact the person who invited you and ask them to send a new invitation.
                  </p>
                  {invitationId && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">Invitation ID: {invitationId}</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link to="/login" className="inline-flex justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors">
                      Go to login
                    </Link>
                    <Link to="/" className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium">
                      Home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full mx-auto text-center space-y-6">
              {invitationId && (
                <p className="text-xs text-gray-500 dark:text-gray-500">Invitation ID: {invitationId}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/login" className="inline-flex justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors">
                  Go to login
                </Link>
                <Link to="/" className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium">
                  Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </InvitationPageWrap>
    )
  }

  // ── Shared decline confirmation panel ──────────────────────────────────────

  const DeclineConfirmPanel = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Decline invitation</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Decline this invitation? You will not be added to{' '}
        <span className="font-medium">{invitation?.project_name}</span>. You can ask the sender for a new invite later if you change your mind.
      </p>
      {appointmentFlow && (
        <AppointmentAcceptPanel
          flowType={appointmentFlow}
          managerRecord={managerAppointment}
          teamRecord={teamAppointment}
          showDeclineFields
          declineReason={declineReason}
          declineNote={declineNote}
          onDeclineReasonChange={setDeclineReason}
          onDeclineNoteChange={setDeclineNote}
        />
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={cancelDecline}
          disabled={declining}
          className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmDecline}
          disabled={declining}
          className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {declining ? (
            <><Loader className="h-4 w-4 animate-spin" />Declining…</>
          ) : (
            <><XCircle className="h-4 w-4" />Confirm decline</>
          )}
        </button>
      </div>
    </div>
  )

  // ── Shared error banner ────────────────────────────────────────────────────

  const ErrorBanner = error ? (
    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
        <p className="ml-3 text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    </div>
  ) : null

  // ── Right panel content by userStatus ──────────────────────────────────────

  const inviteeName = invitation
    ? [invitation.invited_first_name, invitation.invited_last_name].filter(Boolean).join(' ') ||
      invitation.invited_email
    : ''

  // Panel A — Already authenticated (session active)
  const AuthenticatedPanel = (
    <form onSubmit={handleAcceptAuthenticated} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
          <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {appointmentFlow ? 'Accept formal appointment' : 'Accept invitation'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">You're signed in and ready to accept.</p>
        </div>
      </div>

      {appointmentFlow && (
        <AppointmentAcceptPanel
          flowType={appointmentFlow}
          managerRecord={managerAppointment}
          teamRecord={teamAppointment}
          acceptance={acceptanceFields}
          onAcceptanceChange={setAcceptanceFields}
        />
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={accepting}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {accepting ? (
            <><Loader className="h-5 w-5 animate-spin" />Accepting…</>
          ) : (
            <><CheckCircle className="h-5 w-5" />Accept Invitation</>
          )}
        </button>
        <button type="button" onClick={openDecline} disabled={accepting} className="w-full px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50">
          Decline Invitation
        </button>
      </div>
    </form>
  )

  // Panel B — Registered user, not logged in
  const RegisteredPanel = (
    <form onSubmit={handleSignInAndAccept} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Welcome back{inviteeName ? `, ${inviteeName.split(' ')[0]}` : ''}!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You already have an account. Sign in to accept this invitation.
          </p>
        </div>
      </div>

      {/* Pre-filled, read-only email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <div className="pl-10 py-2 px-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-400 select-none">
            {invitation?.invited_email}
          </div>
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="pl-10 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            placeholder="Your password"
          />
        </div>
        <div className="mt-1 text-right">
          <Link
            to={`/forgot-password?email=${encodeURIComponent(invitation?.invited_email || '')}`}
            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {appointmentFlow && (
        <AppointmentAcceptPanel
          flowType={appointmentFlow}
          managerRecord={managerAppointment}
          teamRecord={teamAppointment}
          acceptance={acceptanceFields}
          onAcceptanceChange={setAcceptanceFields}
        />
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={accepting}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {accepting ? (
            <><Loader className="h-5 w-5 animate-spin" />Signing in…</>
          ) : (
            <><CheckCircle className="h-5 w-5" />Sign In &amp; Accept</>
          )}
        </button>
        <button type="button" onClick={openDecline} disabled={accepting} className="w-full px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50">
          Decline Invitation
        </button>
      </div>
    </form>
  )

  // Panel C — Brand new user
  const NewUserPanel = (
    <form onSubmit={handleCreateAndAccept} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create your account</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Use the email this invitation was sent to. Choose a secure password to continue.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Set password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="pl-10 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="At least 6 characters"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="pl-10 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Confirm your password"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={accepting}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {accepting ? (
            <><Loader className="h-5 w-5 animate-spin" />Creating Account…</>
          ) : (
            <><CheckCircle className="h-5 w-5" />Accept &amp; Create Account</>
          )}
        </button>
        <button type="button" onClick={openDecline} disabled={accepting} className="w-full px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50">
          Decline Invitation
        </button>
      </div>
    </form>
  )

  const rightPanelContent = declineConfirmOpen
    ? DeclineConfirmPanel
    : userStatus === USER_STATUS.AUTHENTICATED
      ? AuthenticatedPanel
      : userStatus === USER_STATUS.REGISTERED
        ? RegisteredPanel
        : NewUserPanel

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <InvitationPageWrap>
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Project invitation
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Review the details below, then accept to join the project or decline if this was not expected.
          </p>
        </div>

        {invitation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
            <InvitationDetailsCard invitation={invitation} />

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-gray-300/40 dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
              <div className="px-6 py-5 space-y-4 flex-1">
                {ErrorBanner}
                {rightPanelContent}
              </div>

              {/* "Already have an account?" link — only for new-user form */}
              {!declineConfirmOpen && userStatus === USER_STATUS.NEW && (
                <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4 px-6 pb-6">
                  <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Already have an account? Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </InvitationPageWrap>
  )
}
