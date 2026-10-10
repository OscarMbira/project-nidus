import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import TestingPageShell from '../../components/testing/TestingPageShell'
import {
  createTestEnvironment,
  getTestEnvironment,
  updateTestEnvironment,
} from '../../services/testEnvironmentService'

const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200'
const controlClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

export default function TestEnvironmentFormPage() {
  const { environmentKey } = useParams()
  const isNew = !environmentKey
  return (
    <TestingPageShell
      title={isNew ? 'New environment' : 'Environment'}
      subtitle="Name the target environment used on test suites."
    >
      {({ projectId }) => <Editor isNew={isNew} environmentKey={environmentKey} projectId={projectId} />}
    </TestingPageShell>
  )
}

function Editor({ isNew, environmentKey, projectId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const editing = isNew || location.pathname.endsWith('/edit')
  const { showSuccess, modal } = useSuccessModal()
  const [row, setRow] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const { confirmBack } = useUnsavedChangesGuard(dirty)

  useEffect(() => {
    if (isNew || !environmentKey || !projectId) return undefined
    let cancelled = false
    setLoading(true)
    getTestEnvironment(projectId, environmentKey)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          setError('This environment was not found on the current project.')
          return
        }
        setRow(found)
        setName(found.name || '')
        setDescription(found.description || '')
        setIsActive(found.is_active !== false)
        setDirty(false)
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Could not load this environment.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isNew, environmentKey, projectId])

  useEffect(() => {
    if (formTab !== 'audit' || !row) return undefined
    let cancelled = false
    resolveAuditUserLabels(platformDb, [row.created_by, row.updated_by]).then((labels) => {
      if (!cancelled) setAuditUserLabels(labels)
    })
    return () => { cancelled = true }
  }, [formTab, row])

  const withQuery = (path) => {
    const query = searchParams.toString()
    return query ? `${path}?${query}` : path
  }

  const close = () => {
    confirmBack()
  }

  const save = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: trimmed,
        description: description.trim() || null,
        is_active: isActive,
        project_id: projectId,
      }
      if (isNew) {
        const created = await createTestEnvironment(payload)
        setDirty(false)
        showSuccess({
          recordId: created.name,
          operation: 'created',
          message: 'The environment was added to this project.',
          onOk: () => navigate(withQuery('/platform/testing/environments')),
        })
        return
      }
      const updated = await updateTestEnvironment(row.id, {
        name: trimmed,
        description: description.trim() || null,
        is_active: isActive,
      })
      setDirty(false)
      setRow(updated)
      showSuccess({
        recordId: updated.name,
        operation: 'updated',
        message: 'The environment was updated.',
        onOk: () => navigate(withQuery('/platform/testing/environments')),
      })
    } catch (err) {
      setError(err?.message || 'Could not save this environment.')
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project.</p>
  if (loading) return <p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p>

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={close}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {modal}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between px-5 pt-4">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
          {!editing && row && (
            <button
              type="button"
              onClick={() => navigate(withQuery(`/platform/testing/environments/${encodeURIComponent(row.name)}/edit`))}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Edit
            </button>
          )}
        </div>
        {formTab === 'audit' ? (
          <div className="p-5">
            {!row ? (
              <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this environment is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this environment, and how it is classified.">
                <AuditCard title="Identity" description="How this environment is labelled.">
                  <AuditField label="Name" value={row.name} />
                  <AuditField label="Status" value={row.is_active ? 'Active' : 'Inactive'} />
                </AuditCard>
                <AuditCard title="Classification" description="How this environment is used.">
                  <AuditField label="Description" value={row.description} />
                  <AuditField label="Active" value={humanizeAuditToken(String(row.is_active))} />
                </AuditCard>
                <AuditCard title="Record history" description="When this environment was created and last changed.">
                  <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
                  <AuditField label="Updated by" value={row.updated_by ? auditUserLabels[row.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4 p-5">
            <fieldset disabled={!editing} className="space-y-4 disabled:opacity-80">
              <div>
                <label className={labelClass} htmlFor="environment-name">Name <span className="text-red-400">*</span></label>
                <input
                  id="environment-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true) }}
                  className={controlClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="environment-description">Description</label>
                <textarea
                  id="environment-description"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDirty(true) }}
                  rows={3}
                  className={`${controlClass} resize-none`}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => { setIsActive(e.target.checked); setDirty(true) }}
                />
                Active
              </label>
            </fieldset>
            {editing && (
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : isNew ? 'Create environment' : 'Update environment'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
