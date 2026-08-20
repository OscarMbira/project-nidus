import { useState, useEffect } from 'react'
import { Save, RotateCcw, Shield } from 'lucide-react'
import TemplatePreviewPanel from './TemplatePreviewPanel'
import { upsertTemplate, resetTemplateToDefault } from '../api/invitationTemplatesApi'
import { resolveInvitationTemplatePlaceholders } from '../utils/resolveInvitationTemplatePlaceholders'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

/**
 * @param {{
 *   accountId: string,
 *   authUserId: string | null,
 *   roleMeta: { role_name: string, role_display_name?: string },
 *   template: object | null,
 *   readOnly: boolean,
 *   samplePreviewContext: object,
 *   onSaved: () => void,
 * }} props
 */
export default function RoleTemplateCard({
  accountId,
  authUserId,
  roleMeta,
  template,
  readOnly,
  samplePreviewContext,
  onSaved,
}) {
  const roleName = roleMeta?.role_name || ''
  const displayName = roleMeta?.role_display_name || roleName

  const [label, setLabel] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    setLabel(template?.template_label || displayName)
    setSubject(template?.subject_line || '')
    setBody(template?.message_body || '')
    setActive(template?.is_active !== false)
  }, [template, displayName])

  useEffect(() => {
    if (formTab !== 'audit' || !template?.id) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [template.created_by, template.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, template])

  const handleSave = async () => {
    if (readOnly || !accountId || !roleName) return
    setSaving(true)
    setMessage(null)
    const res = await upsertTemplate(
      accountId,
      roleName,
      {
        template_label: label,
        subject_line: subject,
        message_body: body,
        is_active: active,
      },
      authUserId,
    )
    setSaving(false)
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Save failed' })
      return
    }
    setMessage({
      type: 'ok',
      text: `Template for ${displayName} saved at ${new Date().toLocaleString()}`,
    })
    onSaved?.()
  }

  const handleReset = async () => {
    if (readOnly || !accountId || !roleName) return
    if (!window.confirm(`Reset template for “${displayName}” to the system default message?`)) return
    setSaving(true)
    setMessage(null)
    const res = await resetTemplateToDefault(accountId, roleName, authUserId)
    setSaving(false)
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Reset failed' })
      return
    }
    const row = res.data
    if (row) {
      setLabel(row.template_label || displayName)
      setSubject(row.subject_line || '')
      setBody(row.message_body || '')
      setActive(row.is_active !== false)
    }
    setMessage({ type: 'ok', text: `Reset to default for ${displayName}` })
    onSaved?.()
  }

  return (
    <article className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 text-purple-500 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{displayName}</h3>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{roleName}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 shrink-0">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={readOnly}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Active
        </label>
      </div>

      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' ? (
        !template?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this template is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this invitation template.">
            <AuditCard title="Identity" description="How this template is labelled.">
              <AuditField label="Label" value={template.template_label} />
              <AuditField label="Role" value={displayName} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this template is used.">
              <AuditField label="Active" value={template.is_active !== false ? 'Yes' : 'No'} />
            </AuditCard>
            <AuditCard title="Record history" description="When this template was created and last changed.">
              <AuditField label="Created by" value={template.created_by ? auditUserLabels[template.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={template.created_at} />
              <AuditField label="Updated by" value={template.updated_by ? auditUserLabels[template.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={template.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      ) : (
      <>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          Subject line (reserved for future email integration)
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Message body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={readOnly}
          rows={6}
          className="w-full min-h-[8rem] resize-y px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Preview (sample data):{' '}
          <span className="italic">
            {resolveInvitationTemplatePlaceholders(body?.slice(0, 120) || '', samplePreviewContext || {})}
            {(body || '').length > 120 ? '…' : ''}
          </span>
        </p>
        <TemplatePreviewPanel messageBody={body} sampleContext={samplePreviewContext} />
      </div>
      </>
      )}

      {message && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            message.type === 'ok'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to default
          </button>
        </div>
      )}
    </article>
  )
}
