import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { X, Save, FolderOpen } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '@nidus/ui/SelectField'
import { RowActionButton } from '@nidus/ui'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { environmentIdsFromSuite, legacyEnvironmentLabel, multilineToTags, tagsToMultiline } from '../../utils/suiteFieldValues'

const SUITE_TYPES = ['functional','regression','smoke','uat','performance','security','integration','exploratory','sanity']
const STATUSES    = ['draft','active','archived']

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1'
const controlClass = 'w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function TestSuiteForm({
  suite,
  projectId,
  onSave,
  onClose,
  projectIdKey = 'project_id',
  layout = 'modal',
  fetchEnvironments,
  environmentsPath = '/platform/testing/environments',
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    suite_type: 'functional',
    status: 'draft',
    version: '1.0',
    environmentIds: [],
    estimated_duration_minutes: '',
    tags: '',
  })
  const [environmentOptions, setEnvironmentOptions] = useState([])
  const [environmentPick, setEnvironmentPick] = useState('')
  const legacyEnvironmentApplied = useRef(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [dirty, setDirty] = useState(false)
  const { confirmDiscard } = useUnsavedChangesGuard(dirty)

  const close = async () => {
    if (await confirmDiscard()) onClose()
  }

  const setField = (key, value) => {
    setDirty(true)
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (formTab !== 'audit' || !suite) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [suite.created_by, suite.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, suite])

  useEffect(() => {
    if (!projectId || typeof fetchEnvironments !== 'function') {
      setEnvironmentOptions([])
      return undefined
    }
    let cancelled = false
    fetchEnvironments(projectId)
      .then((rows) => { if (!cancelled) setEnvironmentOptions(rows || []) })
      .catch(() => { if (!cancelled) setEnvironmentOptions([]) })
    return () => { cancelled = true }
  }, [projectId, fetchEnvironments])

  useEffect(() => {
    if (!suite) return
    setForm({
      name: suite.name || '',
      description: suite.description || '',
      suite_type: suite.suite_type || 'functional',
      status: suite.status || 'draft',
      version: suite.version || '1.0',
      environmentIds: environmentIdsFromSuite(suite, []),
      estimated_duration_minutes: suite.estimated_duration_minutes || '',
      tags: tagsToMultiline(suite.tags),
    })
    setDirty(false)
  }, [suite])

  useEffect(() => {
    legacyEnvironmentApplied.current = false
  }, [suite])

  useEffect(() => {
    if (!suite || !environmentOptions.length || legacyEnvironmentApplied.current) return
    legacyEnvironmentApplied.current = true
    setForm((current) => {
      if (current.environmentIds.length) return current
      const ids = environmentIdsFromSuite(suite, environmentOptions)
      if (!ids.length) return current
      return { ...current, environmentIds: ids }
    })
  }, [suite, environmentOptions])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Suite name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        suite_type: form.suite_type,
        status: form.status,
        version: form.version,
        [projectIdKey]: projectId,
        tags: multilineToTags(form.tags),
        environment_ids: form.environmentIds,
        environment: legacyEnvironmentLabel(form.environmentIds, environmentOptions) || null,
        estimated_duration_minutes: form.estimated_duration_minutes
          ? parseInt(form.estimated_duration_minutes) : null,
      }
      await onSave(payload)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className={labelClass}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        className={`${controlClass} ${errors[key] ? 'border-red-500' : ''}`}
      />
      {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  const panel = (
    <div className={layout === 'inline'
      ? 'w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      : 'bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700'}
    >
        {layout !== 'inline' && (
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {suite ? 'Edit Test Suite' : 'New Test Suite'}
            </h2>
          </div>
          <button type="button" onClick={close} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        )}

        <div className="px-5 pt-4">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
        </div>

        {formTab === 'audit' ? (
          <div className="p-5">
            {!suite ? (
              <p className="text-sm text-gray-400">Audit details appear after this test suite is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this test suite, and how it is classified.">
                <AuditCard title="Identity" description="How this test suite is labelled and tracked.">
                  <AuditField label="Name" value={suite.name} />
                  <AuditField label="Status" value={humanizeAuditToken(suite.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="How this test suite is categorised.">
                  <AuditField label="Suite type" value={humanizeAuditToken(suite.suite_type)} />
                  <AuditField label="Version" value={suite.version} />
                </AuditCard>
                <AuditCard title="Record history" description="When this test suite was created and last changed.">
                  <AuditField label="Created by" value={suite.created_by ? auditUserLabels[suite.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={suite.created_at} />
                  <AuditField label="Updated by" value={suite.updated_by ? auditUserLabels[suite.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={suite.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {field('Suite Name', 'name', 'text', true)}

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              className={`${controlClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Suite Type</label>
              <select
                value={form.suite_type}
                onChange={(e) => setField('suite_type', e.target.value)}
                className={controlClass}
              >
                {SUITE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                className={controlClass}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Version', 'version')}
            {field('Est. Duration (min)', 'estimated_duration_minutes', 'number')}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className={labelClass}>Target Environment</label>
              <Link to={environmentsPath} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                Manage environments
              </Link>
            </div>
            <SelectField
              options={environmentOptions
                .filter((option) => option.is_active !== false && !form.environmentIds.includes(String(option.id)))
                .map((option) => ({ value: option.id, label: option.name }))}
              value={environmentPick}
              onChange={(value) => {
                if (!value) return
                setField('environmentIds', [...form.environmentIds, String(value)])
                setEnvironmentPick('')
              }}
              placeholder={environmentOptions.length ? 'Add an environment' : 'No environments yet'}
              forceSearchable
              aria-label="Target environment"
            />
            {!form.environmentIds.length && suite?.environment && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Current: {suite.environment}</p>
            )}
            {form.environmentIds.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {form.environmentIds.map((id) => {
                  const option = environmentOptions.find((row) => String(row.id) === String(id))
                  return (
                    <li key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                      <span>{option?.name || 'Saved environment'}</span>
                      <RowActionButton
                        variant="delete"
                        label="Remove environment"
                        onClick={() => setField('environmentIds', form.environmentIds.filter((current) => current !== id))}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <label className={labelClass}>Tags</label>
            <MultiLineListInput
              viewModeId="test-suite-tags"
              value={form.tags}
              onChange={(value) => setField('tags', value)}
              itemColumnLabel="Tag"
              placeholder="Add a tag"
              ariaLabelPrefix="tag"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                text-white rounded-lg disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : suite ? 'Update Suite' : 'Create Suite'}
            </button>
          </div>
        </form>
        )}
    </div>
  )

  if (layout === 'inline') return panel
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      {panel}
    </div>
  )
}
