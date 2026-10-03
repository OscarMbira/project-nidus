/**
 * Public Intake Forms (GAP-06) — detail/view page. v963 Phase 9.
 * Details tab shows the form's config and its public submission link (the token is
 * deliberately public/shareable — this is not a secret, unlike a guest access token).
 * Manage Fields and View Submissions are separate routed sub-views (rule 65).
 * Audit tab is the mandatory Identity/Classification/Record history card set (rule 63.1).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, ListChecks, Inbox, Copy } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getForm } from '../../../services/intakeFormService'

export default function IntakeFormDetailPage({ sim = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await getForm(id, { sim })
      if (!cancelled) {
        setForm(data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, sim])

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!form) return <div className="p-8 text-gray-500 dark:text-gray-400">Intake form not found.</div>

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/intake/${form.public_token}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — non-fatal, the link is still visible on screen to copy manually
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate('..')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Intake Forms
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.form_name}</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('fields')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
            <ListChecks className="h-4 w-4" />
            Manage Fields
          </button>
          <button type="button" onClick={() => navigate('submissions')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
            <Inbox className="h-4 w-4" />
            Submissions
          </button>
          <button type="button" onClick={() => navigate('edit')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Intake form sections" />

      {activeTab === 'details' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Creates a</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{form.target_entity_type}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${form.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Active window</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{form.active_from || '—'} to {form.active_to || '—'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Public submission link</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Share this link with anyone who should submit to this form — no login required.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-nowrap">{publicUrl}</code>
              <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-xs font-medium">
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this intake form.">
          <AuditCard title="Identity">
            <AuditField label="Form name" value={form.form_name} />
            <AuditField label="Form code" value={form.form_code} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Creates a" value={form.target_entity_type} />
            <AuditField label="Status" value={form.is_active ? 'Active' : 'Inactive'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={form.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={form.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
