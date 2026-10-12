/**
 * v1239 Slice 5.3 / 6.5 — Planner sign-in, sign-up (email + name only, D4), email-verified
 * landing and password reset. Account creation happens server-side on first verified sign-in
 * (planner_create_account, SQL v1247), so there is no organisation-setup step.
 */
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import PublicLayout, { AuthCard, inputCls, primaryBtn } from './PublicLayout.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { isSignupOpen } from '../../lib/plannerApi.js'
import { rememberPendingPlan } from '../../lib/pendingPlan.js'

const Err = ({ msg }) => (msg ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg}</p> : null)

export function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/app'
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(form.email.trim(), form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PublicLayout>
      <AuthCard title="Sign in" footer={<>New here? <Link to="/signup" className="text-blue-600 dark:text-blue-400 underline">Start a free trial</Link></>}>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">Email<input type="email" required autoComplete="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="block text-sm">Password<input type="password" required autoComplete="current-password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <Err msg={error} />
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-right text-sm"><Link to="/reset-password" className="text-blue-600 dark:text-blue-400 underline">Forgot password?</Link></p>
        </form>
      </AuthCard>
    </PublicLayout>
  )
}

/** Sign-up form checks before calling the auth service. Pure; exported for tests. */
export function validateSignup({ fullName, email, password }) {
  if (!String(fullName || '').trim()) return 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return 'Enter a valid email address.'
  if (String(password || '').length < 8) return 'Use at least 8 characters for your password.'
  return null
}

export function SignupPage() {
  const { signUp, user } = useAuth()
  // Invited people may always create an account (the public sign-up switch does not apply).
  const [params] = useSearchParams()
  const invited = params.get('invited') === '1'
  // Chosen on the pricing page: after confirming the email they go straight to checkout.
  const planId = params.get('plan')
  useEffect(() => { if (planId) rememberPendingPlan(planId) }, [planId])
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  useEffect(() => { isSignupOpen().then(setOpen) }, [])
  if (user) return <Navigate to="/app" replace />

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateSignup(form)
    if (problem) { setError(problem); return }
    setBusy(true)
    setError(null)
    try {
      await signUp({ email: form.email.trim(), password: form.password, fullName: form.fullName.trim() })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <AuthCard title="Start your free trial" footer={<>Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 underline">Sign in</Link></>}>
        {invited && !sent && <p className="mb-3 text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">You were invited to a project. Create your account with the email address the invitation was sent to — or <Link to="/login" className="underline">sign in</Link> if you already have one.</p>}
        {planId && !invited && !sent && <p className="mb-3 text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">Create your account, confirm your email, and you will go straight to checkout for the plan you chose.</p>}
        {open === false && !invited ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">Sign-up opens soon. Please check back later.</p>
        ) : sent ? (
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white">Check your email</p>
            <p>We sent a confirmation link to <strong>{form.email}</strong>. Open it to finish setting up your workspace{planId ? ' and complete your subscription' : ''}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <label className="block text-sm">Your name<input required autoComplete="name" className={inputCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <label className="block text-sm">Work email<input type="email" required autoComplete="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="block text-sm">Password<input type="password" required autoComplete="new-password" minLength={8} className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <Err msg={error} />
            <button type="submit" disabled={busy || (open === null && !invited)} className={primaryBtn}>{busy ? 'Creating…' : 'Create my account'}</button>
            <p className="text-xs text-gray-500 dark:text-gray-400">14 days free, no card. You can rename your workspace later.</p>
          </form>
        )}
      </AuthCard>
    </PublicLayout>
  )
}

/** Email-confirmation landing: the auth link signs the user in; the workspace is created on /app. */
export function VerifyPage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />
  return (
    <PublicLayout>
      <AuthCard title="Confirming your email">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {loading ? 'One moment…' : <>The link has expired or was already used. <Link to="/login" className="text-blue-600 dark:text-blue-400 underline">Sign in</Link> to continue.</>}
        </p>
      </AuthCard>
    </PublicLayout>
  )
}

export function ResetPasswordPage() {
  const { sendReset, updatePassword, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Arriving from the email link signs the user in for a password change.
  const recovering = !!user

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (recovering) {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        await updatePassword(password)
        navigate('/app', { replace: true })
      } else {
        await sendReset(email.trim())
        setDone(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <AuthCard title={recovering ? 'Choose a new password' : 'Reset your password'} footer={<Link to="/login" className="text-blue-600 dark:text-blue-400 underline">Back to sign in</Link>}>
        {done ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">If an account exists for {email}, a reset link is on its way.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {recovering ? (
              <label className="block text-sm">New password<input type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            ) : (
              <label className="block text-sm">Email<input type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            )}
            <Err msg={error} />
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Working…' : recovering ? 'Save password' : 'Send reset link'}</button>
          </form>
        )}
      </AuthCard>
    </PublicLayout>
  )
}
