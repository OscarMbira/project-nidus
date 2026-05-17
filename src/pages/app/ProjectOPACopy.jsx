import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, PauseCircle } from 'lucide-react'
import { useOPATailoringContext } from '../../hooks/useOPATailoringContext'
import { getOPAById } from '../../services/opaService'
import { getOPAById as getSimOPAById } from '../../services/sim/simOPAService'

const STEPS = ['Name & describe', 'Field visibility', 'Review & save']

export default function ProjectOPACopy() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { customisationId: routeId } = useParams()
  const isEditRoute = location.pathname.endsWith('/edit')
  const editId = isEditRoute && routeId ? routeId : null
  const fromOpa = searchParams.get('from_opa')

  useEffect(() => {
    if (fromOpa) setSourceOpaId(fromOpa)
  }, [fromOpa])

  const {
    projectId,
    base,
    svc,
    isSim,
    buildDefaultFieldConfigs,
    normalizeFieldConfigs,
  } = useOPATailoringContext()

  const [step, setStep] = useState(0)
  const [sourceOpa, setSourceOpa] = useState(null)
  const [fieldConfigs, setFieldConfigs] = useState(() => buildDefaultFieldConfigs())
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [version, setVersion] = useState('1.0')
  const [status, setStatus] = useState('draft')
  const [notes, setNotes] = useState('')
  const [isOnHold, setIsOnHold] = useState(false)
  const [onHoldReason, setOnHoldReason] = useState('')
  const [sourceOpaId, setSourceOpaId] = useState(fromOpa || '')
  const [loading, setLoading] = useState(!!editId || !!fromOpa)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await svc.getCustomisationById(editId)
      if (cancelled) return
      if (error || !data) {
        setErr(error?.message || 'Not found')
        setLoading(false)
        return
      }
      setCustomTitle(data.custom_title || '')
      setCustomDescription(data.custom_description || '')
      setVersion(data.version || '1.0')
      setStatus(data.status || 'draft')
      setNotes(data.notes || '')
      setIsOnHold(!!data.is_on_hold)
      setOnHoldReason(data.on_hold_reason || '')
      setSourceOpaId(data.source_opa_id)
      setSourceOpa(data.source)
      const { data: fields } = await svc.getFieldConfigs(editId)
      if (fields?.length) setFieldConfigs(normalizeFieldConfigs(fields))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [editId, svc, normalizeFieldConfigs])

  useEffect(() => {
    const opaId = sourceOpaId || fromOpa
    if (!opaId || editId) return
    let cancelled = false
    ;(async () => {
      const fetcher = isSim ? getSimOPAById : getOPAById
      const { data, error } = await fetcher(opaId)
      if (cancelled) return
      if (error) setErr(error.message)
      else {
        setSourceOpa(data)
        if (!customTitle) setCustomTitle(data?.title || '')
        if (!customDescription && data?.description) setCustomDescription(data.description)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sourceOpaId, fromOpa, isSim, editId, customTitle, customDescription])

  const visibleFields = useMemo(
    () => normalizeFieldConfigs(fieldConfigs).filter((f) => f.is_visible),
    [fieldConfigs, normalizeFieldConfigs]
  )

  const previewSource = sourceOpa || {}

  function updateField(key, patch) {
    setFieldConfigs((prev) => {
      const next = [...prev]
      const idx = next.findIndex((r) => r.field_key === key)
      if (idx >= 0) next[idx] = { ...next[idx], ...patch }
      else next.push({ field_key: key, ...patch })
      return normalizeFieldConfigs(next)
    })
  }

  async function handleSave() {
    if (!projectId || !sourceOpaId) {
      setErr('Source OPA template is required')
      return
    }
    if (!customTitle.trim()) {
      setErr('Title is required')
      return
    }
    setSaving(true)
    setErr(null)
    const payload = {
      project_id: projectId,
      source_opa_id: sourceOpaId,
      custom_title: customTitle.trim(),
      custom_description: customDescription,
      version,
      status: isOnHold ? 'draft' : status,
      notes,
      is_on_hold: isOnHold,
      on_hold_reason: isOnHold ? onHoldReason || 'Draft' : null,
    }
    const { data, error } = editId
      ? await svc.updateCustomisation(editId, payload, fieldConfigs)
      : await svc.createCustomisation(payload, fieldConfigs)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    navigate(`${base}/${data?.id || editId}`)
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-600">Loading…</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to={base} className="inline-flex items-center gap-2 text-gray-600 mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {editId ? 'Edit customised template' : 'Copy & customise OPA template'}
      </h1>
      <p className="text-sm text-gray-600 mb-6">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              i === step ? 'bg-sky-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {err && (
        <p className="text-red-600 mb-4" role="alert">
          {err}
        </p>
      )}

      {step === 0 && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {!editId && !fromOpa && (
              <label className="block">
                <span className="text-sm font-medium">Source OPA ID</span>
                <input
                  value={sourceOpaId}
                  onChange={(e) => setSourceOpaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 min-h-[44px]"
                  placeholder="Paste template OPA UUID"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium">Custom title</span>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 min-h-[44px]"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Version</span>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isOnHold}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 min-h-[44px]"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isOnHold} onChange={(e) => setIsOnHold(e.target.checked)} />
              <PauseCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm">Put on hold (draft queue)</span>
            </label>
            {isOnHold && (
              <input
                value={onHoldReason}
                onChange={(e) => setOnHoldReason(e.target.value)}
                placeholder="On-hold reason"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2"
              />
            )}
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Source OPA (read-only)</h2>
            {sourceOpa ? (
              <dl className="text-sm space-y-2">
                <div>
                  <dt className="text-gray-500">Title</dt>
                  <dd>{previewSource.title}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd>{previewSource.opa_type}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Description</dt>
                  <dd>{previewSource.description || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">Select or paste a source OPA template.</p>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2">Show</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2 text-left">Custom label</th>
                </tr>
              </thead>
              <tbody>
                {normalizeFieldConfigs(fieldConfigs).map((f) => {
                  const locked = f.field_key === 'title'
                  return (
                    <tr key={f.field_key} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2">{f.field_label}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.is_visible}
                          disabled={locked}
                          onChange={(e) => updateField(f.field_key, { is_visible: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.is_required}
                          disabled={locked}
                          onChange={(e) => updateField(f.field_key, { is_required: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={f.custom_label || ''}
                          onChange={(e) => updateField(f.field_key, { custom_label: e.target.value })}
                          className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                          placeholder={f.field_label}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-sky-200 dark:border-sky-800 p-4 bg-sky-50/50 dark:bg-sky-900/20">
            <h2 className="font-semibold mb-3">Live preview</h2>
            <dl className="text-sm space-y-2">
              {visibleFields.map((f) => (
                <div key={f.field_key}>
                  <dt className="text-gray-500">{f.custom_label || f.field_label}</dt>
                  <dd>
                    {f.field_key === 'tags' && Array.isArray(previewSource.tags)
                      ? previewSource.tags.join(', ') || '—'
                      : String(previewSource[f.field_key] ?? '—')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-2">Summary</h2>
            <p>
              <strong>{customTitle}</strong> · v{version} · {isOnHold ? 'On hold' : status}
            </p>
            <p className="text-sm text-gray-600 mt-2">{customDescription || 'No description'}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Visible fields ({visibleFields.length})</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
              {visibleFields.map((f) => (
                <li key={f.field_key}>
                  {f.custom_label || f.field_label}
                  {f.is_required ? ' (required)' : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-40 min-h-[44px]"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white min-h-[44px]"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white min-h-[44px] disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? 'Saving…' : editId ? 'Update' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
