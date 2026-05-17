import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AtSign,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Mail,
  Send,
} from 'lucide-react'
import {
  getSenderProfiles,
  saveSenderProfile,
  deleteSenderProfile,
  setDefaultProfile,
  getActiveProjectTypes,
} from '../../services/emailSenderProfileService'
import {
  RESEND_DEFAULT_FROM_EMAIL,
  RESEND_DEFAULT_FROM_DOMAIN,
} from '../../services/emailConfigService'
import { appDb } from '../../services/supabase/supabaseClient'

const EMPTY_FORM = {
  id: null,
  profile_name: '',
  project_type_id: '',
  from_email: RESEND_DEFAULT_FROM_EMAIL,
  from_name: 'Project Nidus',
  is_default: false,
}

export default function EmailSenderProfiles() {
  const [profiles, setProfiles] = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [feedback, setFeedback] = useState(null)

  // Test email state
  const [testProfile, setTestProfile] = useState(null)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testFeedback, setTestFeedback] = useState(null)

  const showFeedback = (type, message) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 7000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [profilesRes, typesRes] = await Promise.all([
      getSenderProfiles(),
      getActiveProjectTypes(),
    ])
    if (profilesRes.success) setProfiles(profilesRes.data)
    else showFeedback('error', profilesRes.error)
    if (typesRes.success) setProjectTypes(typesRes.data)
    setLoading(false)
  }, [])

  const openTestModal = async (profile) => {
    setTestFeedback(null)
    setTestProfile(profile)
    const { data: { user } } = await appDb.auth.getUser()
    setTestEmail(user?.email || '')
  }

  const closeTestModal = () => {
    setTestProfile(null)
    setTestEmail('')
    setTestFeedback(null)
  }

  const handleSendTest = async () => {
    if (!testEmail) return
    setTesting(true)
    setTestFeedback(null)
    try {
      const { data, error } = await appDb.functions.invoke('send-email', {
        body: {
          to: testEmail,
          from: testProfile.from_email,
          from_name: testProfile.from_name,
          subject: `[Test] Email from ${testProfile.from_name} — Project Nidus`,
          html: [
            '<div style="font-family:sans-serif;padding:32px;max-width:480px;">',
            `<h2 style="color:#1e40af;">Sender Profile Test</h2>`,
            `<p>This test email confirms the <strong>${testProfile.profile_name}</strong> sender profile is working correctly.</p>`,
            `<table style="margin-top:16px;border-collapse:collapse;width:100%;">`,
            `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">Profile</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${testProfile.profile_name}</td></tr>`,
            `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">From Name</td><td style="padding:6px 0;font-size:13px;">${testProfile.from_name}</td></tr>`,
            `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;">From Email</td><td style="padding:6px 0;font-size:13px;font-family:monospace;">${testProfile.from_email}</td></tr>`,
            `</table>`,
            `<p style="color:#6b7280;font-size:12px;margin-top:24px;">Sent at ${new Date().toUTCString()}</p>`,
            '</div>',
          ].join(''),
          text: `Sender Profile Test\n\nProfile: ${testProfile.profile_name}\nFrom Name: ${testProfile.from_name}\nFrom Email: ${testProfile.from_email}\n\nSent at ${new Date().toUTCString()}`,
          template_id: 'sender_profile_test',
        },
      })

      if (error) {
        let detail = error.message || 'Edge Function error'
        try {
          if (error.context && typeof error.context.text === 'function') {
            const raw = await error.context.text()
            if (raw) {
              try { detail = JSON.parse(raw)?.error || detail } catch { detail = raw.length < 300 ? raw : detail }
            }
          }
        } catch (_) { /* ignore */ }
        setTestFeedback({ type: 'error', message: `Test failed: ${detail}` })
      } else if (data?.success === false) {
        setTestFeedback({ type: 'error', message: `Test failed: ${data.error}` })
      } else {
        setTestFeedback({ type: 'success', message: `Test email sent to ${testEmail}. Check the inbox — it should appear from "${testProfile.from_name} <${testProfile.from_email}>".` })
      }
    } catch (err) {
      setTestFeedback({ type: 'error', message: err?.message || 'Unexpected error sending test.' })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEdit = (profile) => {
    setForm({
      id: profile.id,
      profile_name: profile.profile_name || '',
      project_type_id: profile.is_default ? '' : (profile.project_type_id || ''),
      from_email: profile.from_email || RESEND_DEFAULT_FROM_EMAIL,
      from_name: profile.from_name || 'Project Nidus',
      is_default: profile.is_default === true,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      project_type_id: form.is_default ? null : (form.project_type_id || null),
    }
    const result = await saveSenderProfile(payload)
    setSaving(false)
    if (result.success) {
      showFeedback(
        'success',
        `Saved "${result.data.profile_name}" — emails will send from ${result.data.from_email}.`
      )
      closeModal()
      await load()
    } else {
      showFeedback('error', result.error || 'Failed to save profile.')
    }
  }

  const handleDelete = async (profile) => {
    if (!window.confirm(`Delete sender profile "${profile.profile_name}"?`)) return
    setDeletingId(profile.id)
    const result = await deleteSenderProfile(profile.id)
    setDeletingId(null)
    if (result.success) {
      showFeedback('success', `Removed profile "${profile.profile_name}".`)
      await load()
    } else {
      showFeedback('error', result.error || 'Failed to delete profile.')
    }
  }

  const handleSetDefault = async (profile) => {
    const result = await setDefaultProfile(profile.id)
    if (result.success) {
      showFeedback('success', `"${profile.profile_name}" is now the system default sender.`)
      await load()
    } else {
      showFeedback('error', result.error || 'Failed to set default.')
    }
  }

  const projectTypeLabel = (profile) => {
    if (profile.is_default) return '★ System Default'
    const name = profile.project_types?.type_name
    if (name) return name
    const match = projectTypes.find((t) => t.id === profile.project_type_id)
    return match?.type_name || '—'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/40 rounded-lg">
              <AtSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sender Profiles</h1>
              <p className="text-sm text-gray-400 mt-1">
                Map project types to From Email and From Name. Provider credentials are configured in{' '}
                <Link to="/platform/admin/email-settings" className="text-blue-400 hover:underline">
                  Email Settings
                </Link>
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </button>
        </div>
        {feedback && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle className="w-5 h-5 shrink-0" />
              : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{feedback.message}</span>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
            <div className="col-span-3">Project Type</div>
            <div className="col-span-3">From Name</div>
            <div className="col-span-3">From Email</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {profiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Mail className="w-8 h-8 mx-auto mb-3 text-gray-500" />
              <p>No sender profiles yet. Add a system default profile to customise outbound email identities.</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-800 last:border-0 hover:bg-gray-800/40"
              >
                <div className="col-span-3 text-sm text-white flex items-center gap-2">
                  {profile.is_default && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                  {projectTypeLabel(profile)}
                </div>
                <div className="col-span-3 text-sm text-gray-300 truncate">{profile.from_name}</div>
                <div className="col-span-3 text-sm text-gray-400 truncate font-mono text-xs">{profile.from_email}</div>
                <div className="col-span-3 flex justify-end gap-1">
                  {!profile.is_default && (
                    <button
                      type="button"
                      title="Set as system default"
                      onClick={() => handleSetDefault(profile)}
                      className="p-2 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-gray-800"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Send test email using this profile"
                    onClick={() => openTestModal(profile)}
                    className="p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-gray-800"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(profile)}
                    className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-gray-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    disabled={deletingId === profile.id}
                    onClick={() => handleDelete(profile)}
                    className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {deletingId === profile.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-500">
          From addresses must use your verified domain <span className="text-gray-400">@{RESEND_DEFAULT_FROM_DOMAIN}</span>.
          Profile name is for admin reference only.
        </p>
      </div>

      {testProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-white">Send Test Email</h2>
              <button type="button" onClick={closeTestModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sending with this profile</p>
                <p className="text-white font-medium">{testProfile.profile_name}</p>
                <p className="text-gray-300">From: <span className="text-white">{testProfile.from_name}</span> &lt;<span className="font-mono text-blue-300 text-xs">{testProfile.from_email}</span>&gt;</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Send test to *</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">Check the received email — the From field should show "{testProfile.from_name}".</p>
              </div>

              {testFeedback && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  testFeedback.type === 'success'
                    ? 'bg-green-900/30 border border-green-700 text-green-300'
                    : 'bg-red-900/30 border border-red-700 text-red-300'
                }`}>
                  {testFeedback.type === 'success'
                    ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{testFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
              <button
                type="button"
                onClick={closeTestModal}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing || !testEmail}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testing ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-white">
                {form.id ? 'Edit Profile' : 'Add Sender Profile'}
              </h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Profile Name *</label>
                <input
                  type="text"
                  value={form.profile_name}
                  onChange={(e) => setForm((f) => ({ ...f, profile_name: e.target.value }))}
                  placeholder="Construction Projects"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="is_default"
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    is_default: e.target.checked,
                    project_type_id: e.target.checked ? '' : f.project_type_id,
                  }))}
                  className="rounded border-gray-600"
                />
                <label htmlFor="is_default" className="text-sm text-gray-300">
                  System Default (fallback for all emails without a matching project type)
                </label>
              </div>

              {!form.is_default && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Project Type *</label>
                  <select
                    value={form.project_type_id}
                    onChange={(e) => setForm((f) => ({ ...f, project_type_id: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select project type…</option>
                    {projectTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>{pt.type_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Name *</label>
                  <input
                    type="text"
                    value={form.from_name}
                    onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">From Email *</label>
                  <input
                    type="email"
                    value={form.from_email}
                    onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
                    placeholder={RESEND_DEFAULT_FROM_EMAIL}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
