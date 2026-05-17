import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Save,
  Send,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
  AtSign,
} from 'lucide-react'
import { appDb } from '../../services/supabase/supabaseClient'
import {
  getEmailConfig,
  saveEmailConfig,
  saveResendConfig,
  sendTestEmail,
  deleteEmailConfig,
  RESEND_DEFAULT_FROM_EMAIL,
  RESEND_DEFAULT_FROM_DOMAIN,
  MASKED_SECRET,
} from '../../services/emailConfigService'

const SMTP_DEFAULTS = {
  host: '',
  port: '587',
  username: '',
  password: '',
  tls: true,
  from_email: '',
  from_name: 'Project Nidus',
  reply_to_email: '',
}

const RESEND_DEFAULTS = {
  api_key: '',
  from_email: RESEND_DEFAULT_FROM_EMAIL,
  from_name: 'Project Nidus',
  reply_to_email: '',
}

const SAVE_TIMEOUT_MS = 20_000

function applyConfigToState(cfg, setters) {
  const activeProvider = (cfg.service_provider || 'smtp').toLowerCase()
  setters.setProvider(activeProvider)
  setters.setExistingId(cfg.id)

  if (activeProvider === 'resend') {
    setters.setResendForm({
      api_key: cfg.api_key || MASKED_SECRET,
      from_email: cfg.from_email || RESEND_DEFAULT_FROM_EMAIL,
      from_name: cfg.from_name || 'Project Nidus',
      reply_to_email: cfg.reply_to_email || '',
    })
    setters.setApiKeyChanged(false)
  } else {
    const smtp = cfg.smtp_config || {}
    setters.setSmtpForm({
      host: smtp.host || '',
      port: String(smtp.port || '587'),
      username: smtp.username || '',
      password: smtp.password || MASKED_SECRET,
      tls: smtp.tls !== false,
      from_email: cfg.from_email || '',
      from_name: cfg.from_name || 'Project Nidus',
      reply_to_email: cfg.reply_to_email || '',
    })
    setters.setPasswordChanged(false)
  }
}

export default function EmailSettings() {
  const [provider, setProvider] = useState('resend')
  const [smtpForm, setSmtpForm] = useState(SMTP_DEFAULTS)
  const [resendForm, setResendForm] = useState(RESEND_DEFAULTS)
  const [existingId, setExistingId] = useState(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [apiKeyChanged, setApiKeyChanged] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const feedbackTimerRef = useRef(null)

  const showFeedback = useCallback((type, message) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setFeedback({ type, message })
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 8000)
  }, [])

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    },
    [],
  )

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sessionData }, result] = await Promise.all([
        appDb.auth.getSession(),
        getEmailConfig(),
      ])

      const email = sessionData?.session?.user?.email
      if (email) {
        setTestEmail(email)
        setCurrentUserEmail(email)
      }

      if (result.success && result.data) {
        applyConfigToState(result.data, {
          setProvider,
          setExistingId,
          setResendForm,
          setSmtpForm,
          setApiKeyChanged,
          setPasswordChanged,
        })
      } else {
        setProvider('resend')
        setExistingId(null)
        setResendForm(RESEND_DEFAULTS)
        setSmtpForm(SMTP_DEFAULTS)
        if (!result.success && result.error) {
          showFeedback('error', result.error)
        }
      }
    } catch (err) {
      showFeedback('error', err?.message || 'Failed to load email settings.')
    } finally {
      setLoading(false)
    }
  }, [showFeedback])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSmtpChange = (field, value) => {
    setSmtpForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'password') setPasswordChanged(true)
  }

  const handleResendChange = (field, value) => {
    setResendForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'api_key') setApiKeyChanged(true)
  }

  const patchStateAfterSave = (result, activeProvider) => {
    if (!result?.data) return
    setExistingId(result.data.id)
    if (activeProvider === 'resend') {
      setApiKeyChanged(false)
      setResendForm((prev) => ({
        ...prev,
        from_email: result.data.from_email ?? prev.from_email,
        from_name: result.data.from_name ?? prev.from_name,
        api_key: MASKED_SECRET,
      }))
    } else {
      setPasswordChanged(false)
      setSmtpForm((prev) => ({
        ...prev,
        from_email: result.data.from_email ?? prev.from_email,
        from_name: result.data.from_name ?? prev.from_name,
        password: MASKED_SECRET,
      }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const savePromise =
        provider === 'resend'
          ? saveResendConfig(resendForm, apiKeyChanged)
          : saveEmailConfig(smtpForm, passwordChanged)

      const result = await Promise.race([
        savePromise,
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Save timed out. Check your connection and that email_configurations RLS (v559+) is applied in Supabase.',
                ),
              ),
            SAVE_TIMEOUT_MS,
          ),
        ),
      ])

      if (result.success) {
        patchStateAfterSave(result, provider)
        showFeedback(
          'success',
          `${provider === 'resend' ? 'Resend' : 'SMTP'} configuration saved successfully.`,
        )
      } else {
        showFeedback('error', result.error || 'Failed to save configuration.')
      }
    } catch (err) {
      showFeedback('error', err?.message || 'Unexpected error saving configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) return showFeedback('error', 'Enter a recipient email for the test.')
    setTesting(true)
    try {
      const result = await sendTestEmail(testEmail)
      if (result.success) {
        showFeedback('success', `Test email sent to ${testEmail}. Check your inbox (and spam).`)
      } else {
        showFeedback('error', `Test failed: ${result.error}`)
      }
    } catch (err) {
      showFeedback('error', err?.message || 'Test email failed.')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingId) return
    if (
      !window.confirm(
        'Remove this email configuration? Transactional emails will stop until you configure a provider again.',
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      const result = await deleteEmailConfig(existingId)
      if (result.success) {
        setExistingId(null)
        setResendForm(RESEND_DEFAULTS)
        setSmtpForm(SMTP_DEFAULTS)
        setPasswordChanged(false)
        setApiKeyChanged(false)
        showFeedback('success', 'Email configuration removed.')
      } else {
        showFeedback('error', result.error || 'Failed to remove configuration.')
      }
    } catch (err) {
      showFeedback('error', err?.message || 'Failed to remove configuration.')
    } finally {
      setDeleting(false)
    }
  }

  const formDisabled = loading || saving

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/40 rounded-lg">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Email Settings</h1>
            <p className="text-sm text-gray-400">
              Configure Resend or SMTP for invitations, organisation verification, and other transactional emails.
              Map per–project-type senders in{' '}
              <Link to="/platform/admin/email-sender-profiles" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                <AtSign className="w-3.5 h-3.5" />
                Sender Profiles
              </Link>
              .
            </p>
          </div>
        </div>

        {feedback && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <span className="text-sm">{feedback.message}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            Loading settings…
          </div>
        )}

        <div className={loading ? 'opacity-50 pointer-events-none space-y-6' : 'space-y-6'}>
        <div className="flex gap-2 p-1 bg-gray-900 border border-gray-700 rounded-xl">
          <button type="button" onClick={() => setProvider('resend')} disabled={formDisabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
              provider === 'resend' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}>
            <Zap className="w-4 h-4" /> Resend API
          </button>
          <button type="button" onClick={() => setProvider('smtp')} disabled={formDisabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
              provider === 'smtp' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}>
            <Settings className="w-4 h-4" /> SMTP
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          {provider === 'resend' ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Resend API</h2>
              </div>
              <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 text-xs text-blue-200 space-y-1">
                <p className="font-medium text-blue-100">Verified domain: {RESEND_DEFAULT_FROM_DOMAIN}</p>
                <p>Use a From address on this domain (e.g. {RESEND_DEFAULT_FROM_EMAIL}). Emails are sent via the Supabase <code className="text-blue-300">send-email</code> Edge Function.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Resend API Key *</label>
                <div className="relative">
                  <input type={showApiKey ? 'text' : 'password'} value={resendForm.api_key}
                    onChange={e => handleResendChange('api_key', e.target.value)}
                    placeholder={existingId && provider === 'resend' ? 'Leave blank to keep current key' : 're_xxxxxxxx'}
                    autoComplete="off" disabled={formDisabled}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-60" />
                  <button type="button" onClick={() => setShowApiKey(v => !v)} disabled={formDisabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <hr className="border-gray-700" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Email *</label>
                  <input type="email" value={resendForm.from_email} disabled={formDisabled}
                    onChange={(e) => handleResendChange('from_email', e.target.value)}
                    placeholder={RESEND_DEFAULT_FROM_EMAIL}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Name</label>
                  <input type="text" value={resendForm.from_name} disabled={formDisabled}
                    onChange={(e) => handleResendChange('from_name', e.target.value)}
                    placeholder="Project Nidus"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Reply-To Email <span className="text-gray-500">(optional)</span></label>
                <input type="email" value={resendForm.reply_to_email} disabled={formDisabled}
                  onChange={(e) => handleResendChange('reply_to_email', e.target.value)}
                  placeholder="support@projectastute.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">SMTP Configuration</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-400">SMTP Host *</label>
                  <input type="text" value={smtpForm.host} disabled={formDisabled}
                    onChange={(e) => handleSmtpChange('host', e.target.value)}
                    placeholder="smtp.resend.com"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Port *</label>
                  <input type="number" value={smtpForm.port} disabled={formDisabled}
                    onChange={(e) => handleSmtpChange('port', e.target.value)}
                    placeholder="587"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Username</label>
                  <input type="text" value={smtpForm.username} disabled={formDisabled}
                    onChange={(e) => handleSmtpChange('username', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={smtpForm.password} disabled={formDisabled}
                      onChange={(e) => handleSmtpChange('password', e.target.value)}
                      placeholder={existingId && provider === 'smtp' ? 'Leave blank to keep current' : 'API key or password'}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} disabled={formDisabled}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" disabled={formDisabled}
                  onClick={() => handleSmtpChange('tls', !smtpForm.tls)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${smtpForm.tls ? 'bg-blue-600' : 'bg-gray-600'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${smtpForm.tls ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-gray-300">Use TLS / STARTTLS (port 587)</span>
              </div>
              <hr className="border-gray-700" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Email *</label>
                  <input type="email" value={smtpForm.from_email} disabled={formDisabled}
                    onChange={(e) => handleSmtpChange('from_email', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Name</label>
                  <input type="text" value={smtpForm.from_name} disabled={formDisabled}
                    onChange={(e) => handleSmtpChange('from_name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Reply-To Email <span className="text-gray-500">(optional)</span></label>
                <input type="email" value={smtpForm.reply_to_email} disabled={formDisabled}
                  onChange={(e) => handleSmtpChange('reply_to_email', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            {existingId && (
              <button type="button" onClick={handleDelete} disabled={deleting || formDisabled}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove
              </button>
            )}
          </div>
          <button type="button" onClick={handleSave} disabled={formDisabled}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {existingId ? 'Update Configuration' : 'Save Configuration'}
          </button>
        </div>

        {existingId && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Send Test Email</h2>
            </div>
            <p className="text-sm text-gray-400">Verify delivery through the active provider before going live.</p>
            <div className="flex gap-3">
              <input type="email" value={testEmail} disabled={formDisabled}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={currentUserEmail || 'recipient@example.com'}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-60" />
              <button type="button" onClick={handleTest} disabled={testing || !testEmail || formDisabled}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test
              </button>
            </div>
          </div>
        )}

        {!existingId && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-sm text-amber-200">
            <p className="font-medium text-amber-100 mb-1">Setup checklist</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-200/90">
              <li>Paste your Resend API key and save.</li>
              <li>Ensure <code className="text-amber-100">send-email</code> Edge Function is deployed to Supabase.</li>
              <li>Send a test email, then check <code className="text-amber-100">email_logs</code> in Supabase if needed.</li>
            </ol>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}