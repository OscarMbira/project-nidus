/**
 * Registration entry-choice screen (v982 Phase 1, task B).
 *
 * Sits in front of the existing signup forms (PlatformRegister.jsx / SimulatorRegister.jsx).
 * `target` selects which one it leads to — this app mounts the same component at BOTH
 * `platform/register` and `simulator/register` (each app has always hosted routes for
 * both signup forms so a user can switch from either domain — see the "Need Simulator
 * instead?" link in PlatformRegister.jsx), so the target can't be hardcoded per file.
 * Every marketing "Sign up" / "Start Free" CTA already links to one of those two paths
 * (confirmed by a codebase-wide audit, task C), so intercepting here reaches real
 * traffic without needing to repoint those links.
 *
 * Three branches (PRD Phase 1, decisions 1-6):
 *  - "For myself"        -> intent='individual', straight into today's wizard.
 *  - "For my organisation" -> intent='organisation', same wizard; Organisation Setup
 *    step later asks the PMO Admin question via a toggle (not a new wizard step).
 *  - "I was invited"     -> never creates a redundant auth account. A direct
 *    invitation link (?invitation=TOKEN) is redirected straight to /i/:token, same as
 *    PlatformRegister.jsx already does. Without a link in hand, an inline lookup by
 *    email tells the user whether a pending invitation exists — no resend action on
 *    this unauthenticated screen (decision 5 — avoids a pre-auth spam vector).
 *
 * `intent` is written to sessionStorage (mirrors the `nidus:acct:*` pattern in
 * accountResolution.js, rule 66) so it survives a mid-wizard refresh, not just
 * location.state.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { User, Building2, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import MainHeader from '../../components/homepage/MainHeader'
import PlatformFooter from '../../components/homepage/PlatformFooter'
import { checkPendingInvitationByEmail } from '../../services/invitationService'

export const REGISTRATION_INTENT_STORAGE_KEY = 'nidus:regIntent'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const THEME = {
  platform: {
    accent: 'blue',
    border: 'hover:border-blue-500 dark:hover:border-blue-500',
    iconArrow: 'group-hover:text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    link: 'text-blue-600 hover:text-blue-500 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
    inputFocus: 'focus:border-blue-500',
  },
  simulator: {
    accent: 'green',
    border: 'hover:border-green-500 dark:hover:border-green-500',
    iconArrow: 'group-hover:text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
    link: 'text-green-600 hover:text-green-500 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700',
    inputFocus: 'focus:border-green-500',
  },
}

export default function RegistrationEntryChoice({ target = 'platform' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState('choice') // 'choice' | 'invited'
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [lookupResult, setLookupResult] = useState(null) // { found, organisationName } | null
  const [lookupError, setLookupError] = useState(null)

  const t = THEME[target] || THEME.platform

  // A direct invitation link (org/PMO invite) skips this screen entirely, same
  // special case PlatformRegister.jsx already handles.
  useEffect(() => {
    const invitation = searchParams.get('invitation')?.trim()
    if (invitation) {
      const declineSuffix = searchParams.get('action') === 'decline' ? '?action=decline' : ''
      navigate(`/i/${encodeURIComponent(invitation)}${declineSuffix}`, { replace: true })
    }
  }, [searchParams, navigate])

  const chooseIntent = useCallback((intent) => {
    try {
      sessionStorage.setItem(REGISTRATION_INTENT_STORAGE_KEY, intent)
    } catch (err) {
      console.warn('[RegistrationEntryChoice] sessionStorage unavailable:', err?.message)
    }
    navigate(`/${target}/register/signup`, { state: { intent } })
  }, [navigate, target])

  const handleLookup = useCallback(async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setLookupError('Enter a valid email address.')
      return
    }
    setLookupError(null)
    setChecking(true)
    setLookupResult(null)
    try {
      const result = await checkPendingInvitationByEmail(trimmed)
      if (!result.success) {
        setLookupError(result.error || 'Could not check for a pending invitation right now.')
      } else {
        setLookupResult({ found: result.found, organisationName: result.organisationName })
      }
    } finally {
      setChecking(false)
    }
  }, [email])

  const resetInvited = useCallback(() => {
    setView('choice')
    setEmail('')
    setLookupResult(null)
    setLookupError(null)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MainHeader
        hidePlatformButton={target === 'platform'}
        hideSimulatorButton
      />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {view === 'choice' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Let's get you set up
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Tell us why you're here so we can skip the questions that don't apply to you.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => chooseIntent('individual')}
                  className={`w-full flex items-center gap-4 p-5 border-2 border-gray-200 dark:border-gray-700 ${t.border} rounded-lg text-left transition-colors group`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${t.iconBg} flex items-center justify-center`}>
                    <User className={`w-6 h-6 ${t.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">For myself</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      A personal or freelance workspace, ready to go — full authority over your own work.
                    </p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-gray-400 ${t.iconArrow} flex-shrink-0`} />
                </button>

                <button
                  type="button"
                  onClick={() => chooseIntent('organisation')}
                  className={`w-full flex items-center gap-4 p-5 border-2 border-gray-200 dark:border-gray-700 ${t.border} rounded-lg text-left transition-colors group`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${t.iconBg} flex items-center justify-center`}>
                    <Building2 className={`w-6 h-6 ${t.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">For my organisation</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Set up a workspace for your team or company — you'll choose whether you also want PMO
                      configuration access.
                    </p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-gray-400 ${t.iconArrow} flex-shrink-0`} />
                </button>

                <button
                  type="button"
                  onClick={() => setView('invited')}
                  className={`w-full flex items-center gap-4 p-5 border-2 border-gray-200 dark:border-gray-700 ${t.border} rounded-lg text-left transition-colors group`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${t.iconBg} flex items-center justify-center`}>
                    <Mail className={`w-6 h-6 ${t.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">I was invited</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Someone already invited you to their organisation or project.
                    </p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-gray-400 ${t.iconArrow} flex-shrink-0`} />
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link to={`/${target}/login`} className={`font-medium ${t.link}`}>
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={resetInvited}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-8">
                <div className={`w-14 h-14 ${t.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Mail className={`w-7 h-7 ${t.iconColor}`} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Find your invitation
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have the invitation link handy? Enter your email and we'll check for a pending
                  invitation.
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label htmlFor="invited-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="invited-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setLookupResult(null); setLookupError(null) }}
                      className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white ${t.inputFocus} focus:outline-none`}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {lookupError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">{lookupError}</p>
                  </div>
                )}

                {lookupResult && (
                  lookupResult.found ? (
                    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-800 dark:text-green-200">
                        We found a pending invitation for{' '}
                        <strong>{lookupResult.organisationName || 'an organisation'}</strong> — check your
                        inbox for the invitation link.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No pending invitation found for that email. If you were expecting one, check with
                        whoever invited you, or set up your own workspace instead.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => chooseIntent('individual')}
                          className={`text-sm font-medium ${t.link}`}
                        >
                          Set up for myself
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseIntent('organisation')}
                          className={`text-sm font-medium ${t.link}`}
                        >
                          Set up for my organisation
                        </button>
                      </div>
                    </div>
                  )
                )}

                <button
                  type="submit"
                  disabled={checking}
                  className={`w-full flex items-center justify-center gap-2 ${t.button} text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {checking ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" /> Checking...
                    </>
                  ) : (
                    'Check for my invitation'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <PlatformFooter />
    </div>
  )
}
