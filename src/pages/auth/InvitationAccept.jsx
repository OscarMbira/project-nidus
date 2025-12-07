/**
 * Invitation Accept Page
 * Handles project invitation acceptance for both new and existing users
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { validateInvitationToken, getInvitationByToken } from '../../services/invitationService'
import { acceptInvitation } from '../../services/projectMembershipService'
import { Mail, Lock, AlertCircle, Loader, CheckCircle, UserPlus } from 'lucide-react'

export default function InvitationAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate invitation token
      const result = await validateInvitationToken(token)
      if (!result.success) {
        setError(result.error || 'Invalid invitation')
        setLoading(false)
        return
      }

      setInvitation(result.data)

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsExistingUser(true)
      } else {
        // Check if user exists with this email
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

  const handleAccept = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isExistingUser) {
      // New user - validate password
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // New user - need to create account first
        if (!isExistingUser) {
          // Sign up
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: invitation.invited_email,
            password: password,
          })

          if (signUpError) throw signUpError

          if (!signUpData.user) {
            throw new Error('Failed to create account')
          }

          // Create user record
          await supabase.from('users').insert([
            {
              auth_user_id: signUpData.user.id,
              email: invitation.invited_email,
              full_name: invitation.invited_email.split('@')[0], // Default name
              is_active: true,
              is_verified: false,
            },
          ])

          // Get internal user ID
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', signUpData.user.id)
            .single()

          // Accept invitation
          const acceptResult = await acceptInvitation(token, userData.id)
          if (!acceptResult.success) {
            throw new Error(acceptResult.error)
          }

          // Auto-login and redirect
          navigate(`/app/projects/${invitation.project_id}`, { replace: true })
        } else {
          setError('Please log in first to accept the invitation')
        }
      } else {
        // Existing user - accept invitation
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

        // Redirect to project
        navigate(`/app/projects/${invitation.project_id}`, { replace: true })
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err.message || 'Failed to accept invitation')
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
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {isExistingUser ? (
              <form onSubmit={handleAccept} className="space-y-4">
                <button
                  type="submit"
                  disabled={accepting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {accepting ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </button>
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

                <button
                  type="submit"
                  disabled={accepting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {accepting ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Accept & Create Account
                    </>
                  )}
                </button>
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

