/**
 * Invitation Accept Page
 * Handles project invitation acceptance for both new and existing users
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { appDb as supabase } from '../../services/supabase/supabaseClient'
import { validateInvitationToken, getInvitationByToken } from '../../services/invitationService'
import { acceptInvitation, declineInvitationByToken } from '../../services/projectMembershipService'
import { normalizeSupabaseAuthError } from '../../utils/authErrorMessage'
import {
  Mail,
  Lock,
  AlertCircle,
  Loader,
  CheckCircle,
  UserPlus,
  XCircle,
} from 'lucide-react'

export default function InvitationAccept() {
  const { token: pathToken } = useParams()
  const [searchParams] = useSearchParams()
  const token = pathToken || searchParams.get('token') || ''
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [invitationId, setInvitationId] = useState(null)
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await validateInvitationToken(token)
      if (!result.success) {
        setError(result.error || 'Invalid invitation')
        setLoading(false)
        return
      }

      setInvitation(result.data)
      let invId = result.data?.invitation_id ?? null

      const detail = await getInvitationByToken(token)
      if (detail.success && detail.data?.id) {
        invId = detail.data.id
      }
      setInvitationId(invId)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setIsExistingUser(true)
      } else {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', result.data.invited_email)
          .single()

        setIsExistingUser(!!existingUser)
      }
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDecline = async () => {
    setError(null)
    setDeclining(true)
    try {
      const res = await declineInvitationByToken(token)
      if (!res.success) {
        setError(res.error || 'Failed to decline invitation')
        return
      }
      setDeclined(true)
      setDeclineConfirmOpen(false)
    } catch (err) {
      console.error('Error declining invitation:', err)
      setError(normalizeSupabaseAuthError(err, 'Failed to decline invitation.'))
    } finally {
      setDeclining(false)
    }
  }

  const handleAccept = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isExistingUser) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setAccepting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!isExistingUser) {
          // ── Edge Function: creates auth user + users row + accepts invite ────────
          // Returns tokens so the browser can call setSession() without any
          // GoTrue network call (setSession is local when the token is fresh).
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

          // Extract actual error body from FunctionsHttpError
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
            const msg  = fnBody?.error || fnError?.message || 'Failed to create account'
            if (code === 'SEAT_LIMIT_EXCEEDED' || msg.includes('No available seats')) {
              throw new Error('No available seats in this project')
            }
            throw new Error(msg)
          }

          // ── Set browser session from tokens returned by the Edge Function ─────
          // setSession() saves tokens locally without calling GoTrue when fresh.
          if (fnBody.session?.access_token) {
            await supabase.auth.setSession({
              access_token: fnBody.session.access_token,
              refresh_token: fnBody.session.refresh_token,
            })
            navigate(`/app/projects/${invitation.project_id}`, { replace: true })
          } else {
            // Edge Function succeeded but couldn't establish session (rare).
            // Account + invitation are done — send user to login.
            navigate('/login?notice=account-created', { replace: true })
          }
        } else {
          setError('Please log in first to accept the invitation')
        }
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!userData) {
          throw new Error('User record not found')
        }

        const acceptResult = await acceptInvitation(token, userData.id)
        if (!acceptResult.success) {
          throw new Error(acceptResult.error)
        }

        navigate(`/app/projects/${invitation.project_id}`, { replace: true })
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(normalizeSupabaseAuthError(err, 'Failed to accept invitation.'))
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            to="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invitation declined</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You have declined this project invitation. Your account was not added to the project.
            </p>
            {invitationId ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Invitation ID: {invitationId}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="inline-flex justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
            >
              Go to login
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Project Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You've been invited to join a project
          </p>
        </div>

        {invitation && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {invitation.project_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Role: {invitation.role_display_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invited by: {invitation.invited_by_name}
              </p>
            </div>

            {invitation.invitation_message && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {invitation.invitation_message}
                </p>
              </div>
            )}

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

            {declineConfirmOpen ? (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Decline this invitation? You will not be added to{' '}
                  <span className="font-medium">{invitation.project_name}</span>. You can ask the
                  sender for a new invite later if you change your mind.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeclineConfirmOpen(false)
                      setError(null)
                    }}
                    disabled={declining}
                    className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDecline()}
                    disabled={declining}
                    className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {declining ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Declining…
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Confirm decline
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : isExistingUser ? (
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeclineConfirmOpen(true)
                      setError(null)
                    }}
                    disabled={accepting}
                    className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50"
                  >
                    Decline Invitation
                  </button>
                  <button
                    type="submit"
                    disabled={accepting}
                    className="w-full sm:flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {accepting ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Accept Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAccept} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Set Password
                  </label>
                  <div className="mt-1 relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeclineConfirmOpen(true)
                      setError(null)
                    }}
                    disabled={accepting}
                    className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium disabled:opacity-50"
                  >
                    Decline Invitation
                  </button>
                  <button
                    type="submit"
                    disabled={accepting}
                    className="w-full sm:flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {accepting ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Accept & Create Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
