/**
 * Create, view, or edit one communication format or level of detail.
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { communicationOptionCodeFromLabel } from '@nidus/shared/utils/communicationOptionCode'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import {
  canMaintainCommunicationInformationOptions,
  getCommunicationInformationOption,
  saveCommunicationInformationOption,
} from '../../services/stakeholderService'
import {
  COMMUNICATION_OPTION_KINDS,
  communicationOptionKindLabel,
  communicationOptionsBasePath,
} from './communicationOptionPaths'

const EMPTY = {
  option_kind: 'format',
  option_code: '',
  option_label: '',
  sort_order: 0,
  is_active: true,
}

export default function CommunicationInformationOptionFormPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { kind, code } = useParams()
  const basePath = communicationOptionsBasePath(pathname)
  const isCreate = pathname.endsWith('/new')
  const readOnly = !isCreate && !pathname.endsWith('/edit')
  const { showSuccess, modal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [canMaintain, setCanMaintain] = useState(false)
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [baseline, setBaseline] = useState(EMPTY)
  const [codeTouched, setCodeTouched] = useState(false)
  const [tab, setTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const allowed = await canMaintainCommunicationInformationOptions()
      if (cancelled) return
      setCanMaintain(allowed)
      if (isCreate) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const row = await getCommunicationInformationOption(decodeURIComponent(kind || ''), decodeURIComponent(code || ''))
        if (cancelled) return
        if (!row) {
          setError('This option was not found.')
          setLoading(false)
          return
        }
        const next = {
          option_kind: row.option_kind,
          option_code: row.option_code,
          option_label: row.option_label,
          sort_order: row.sort_order ?? 0,
          is_active: row.is_active !== false,
        }
        setRecord(row)
        setForm(next)
        setBaseline(next)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load this option')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isCreate, kind, code])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  )
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty && !readOnly, 'Discard changes to this option?')

  function update(patch) {
    setForm((current) => {
      const next = { ...current, ...patch }
      if (isCreate && patch.option_label != null && !codeTouched) {
        next.option_code = communicationOptionCodeFromLabel(patch.option_label)
      }
      return next
    })
  }

  async function save(event) {
    event.preventDefault()
    if (readOnly || !canMaintain) return
    const option_label = form.option_label.trim()
    const option_code = (form.option_code || communicationOptionCodeFromLabel(option_label)).trim().toLowerCase()
    if (!option_label || !option_code) {
      setError('Enter a name. The code is filled from the name.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await saveCommunicationInformationOption({
        option_kind: form.option_kind,
        option_code,
        option_label,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }, record?.id)
      const next = { ...form, option_label, option_code, sort_order: Number(form.sort_order) || 0 }
      setForm(next)
      setBaseline(next)
      showSuccess({
        recordId: saved.option_code,
        operation: record?.id ? 'updated' : 'created',
        message: `${option_label} is saved. Communication plans use it the next time the form opens.`,
        onOk: record?.id ? undefined : () => navigate(`${basePath}/${encodeURIComponent(saved.option_kind)}/${encodeURIComponent(saved.option_code)}`),
      })
      if (record?.id) setRecord((current) => ({ ...current, ...saved, updated_at: new Date().toISOString() }))
    } catch (err) {
      const message = String(err?.message || '')
      setError(message.includes('duplicate') || message.includes('unique')
        ? 'That code is already used for this group.'
        : (message || 'Could not save this option'))
    } finally {
      setSaving(false)
    }
  }

  const title = isCreate ? 'Add communication option' : (readOnly ? 'View communication option' : 'Edit communication option')

  const backToList = () => confirmDiscard(() => navigate(basePath))

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mx-auto mb-4 max-w-3xl">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to communication formats
        </button>
      </div>
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          {!isCreate && form.option_label ? (
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {communicationOptionKindLabel(form.option_kind)} · {form.option_code}
            </p>
          ) : null}
        </div>
        <div className="px-4 pt-3">
          <DetailAuditTabList activeTab={tab} onChange={setTab} />
        </div>
        {loading ? (
          <p className="px-4 py-6 text-gray-700 dark:text-gray-200">Loading…</p>
        ) : tab === 'audit' ? (
          <div className="px-4 py-4">
            {record ? (
              <AuditDetailsPanel>
                <AuditCard title="Identity">
                  <AuditField label="Name" value={record.option_label} />
                  <AuditField label="Code" value={record.option_code} />
                </AuditCard>
                <AuditCard title="Classification">
                  <AuditField label="Used for" value={communicationOptionKindLabel(record.option_kind)} />
                  <AuditField label="Status" value={record.is_active ? 'Active' : 'Inactive'} />
                </AuditCard>
                <AuditCard title="Record history">
                  <AuditTimestampPair dateLabel="Created" value={record.created_at} />
                  <AuditTimestampPair dateLabel="Updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p>
            )}
          </div>
        ) : (
          <form onSubmit={save} className="px-4 py-4">
            <fieldset disabled={readOnly || !canMaintain} className="space-y-4 disabled:opacity-80">
              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Used for
                <select
                  value={form.option_kind}
                  onChange={(event) => update({ option_kind: event.target.value })}
                  disabled={!isCreate}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {COMMUNICATION_OPTION_KINDS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Name
                <input
                  value={form.option_label}
                  onChange={(event) => update({ option_label: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Code
                <input
                  value={form.option_code}
                  onChange={(event) => {
                    setCodeTouched(true)
                    update({ option_code: event.target.value.toLowerCase() })
                  }}
                  disabled={!isCreate}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Order
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => update({ sort_order: event.target.value })}
                  className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => update({ is_active: event.target.checked })}
                />
                Active
              </label>
            </fieldset>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              {!readOnly && canMaintain && (
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                onClick={backToList}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                {readOnly ? 'Back' : 'Cancel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
