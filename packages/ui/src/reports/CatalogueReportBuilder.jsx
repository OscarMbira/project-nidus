/**
 * v1272 — Report Builder on the Ask Nidus data catalogue (PRD D11, stories 16, 24).
 * Shared by Platform (/platform/reports/builder) and Simulator (/simulator/reports/builder).
 *
 *   - data sources and fields come from the catalogue (friendly names; no raw system tables)
 *   - filters, grouping, totals (count, sum, average, min, max) and sorting run in the database
 *     through ai_run_query — the same runner Ask Nidus uses, so numbers always agree
 *   - templates are saved to report_templates.query_spec; ?template=<id> opens a saved report
 *     (including ones saved from Ask Nidus)
 * Theme-aware; back button (rule 73); success modal (rule 16); unsaved-changes guard (rule 52);
 * Audit details tab (rule 63.1).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Play, Plus, Save, Trash2 } from 'lucide-react'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import DetailAuditTabList from '../DetailAuditTabList.jsx'
import AuditDetailsPanel from '../AuditDetailsPanel.jsx'
import AuditCard from '../AuditCard.jsx'
import AuditField from '../AuditField.jsx'
import AiResultTable from '../ai/AiResultTable.jsx'

const TABS = [
  { value: 'source', label: 'Data source' },
  { value: 'fields', label: 'Fields' },
  { value: 'filters', label: 'Filters' },
  { value: 'grouping', label: 'Grouping & totals' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'audit', label: 'Audit details' },
]
const OPS = [
  ['eq', 'is'], ['neq', 'is not'], ['contains', 'contains'], ['gt', 'greater than'], ['lt', 'less than'],
  ['gte', 'at least'], ['lte', 'at most'], ['is_null', 'is empty'], ['not_null', 'is not empty'],
  ['before_today', 'is before today'], ['within_next_days', 'within the next N days'], ['within_last_days', 'within the last N days'],
]
const NO_VALUE = ['is_null', 'not_null', 'before_today', 'after_today']
const EMPTY = { entity: '', fields: [], filters: [], group_by: [], aggregates: [], sort: [] }
const inputCls = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

function toSpec(q) {
  const spec = { entity: q.entity }
  if (q.fields.length && !q.aggregates.length) spec.fields = q.fields
  const filters = q.filters.filter((f) => f.field && (NO_VALUE.includes(f.op) || String(f.value ?? '').trim() !== ''))
    .map((f) => (NO_VALUE.includes(f.op) ? { field: f.field, op: f.op } : { field: f.field, op: f.op, value: f.value }))
  if (filters.length) spec.filters = filters
  if (q.aggregates.length) {
    spec.aggregates = q.aggregates.map((a) => (a.field ? { fn: a.fn, field: a.field } : { fn: a.fn }))
    if (q.group_by.length) spec.group_by = q.group_by
  }
  const sort = q.sort.filter((s) => s.field)
  if (sort.length) spec.sort = sort
  return spec
}

function fromSpec(spec) {
  if (!spec?.entity) return EMPTY
  return {
    entity: spec.entity,
    fields: spec.fields || [],
    filters: (spec.filters || []).map((f) => ({ ...f, value: f.value ?? '' })),
    group_by: spec.group_by || [],
    aggregates: (spec.aggregates || []).map((a) => ({ fn: a.fn, field: a.field || '' })),
    sort: spec.sort || [],
  }
}

export default function CatalogueReportBuilder() {
  const { db } = useAppConfig()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const templateId = params.get('template')
  const [tab, setTab] = useState('source')
  const [catalogue, setCatalogue] = useState([])
  const [templates, setTemplates] = useState([])
  const [template, setTemplate] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [q, setQ] = useState(EMPTY)
  const [saved, setSaved] = useState({ name: '', description: '', q: EMPTY })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { showSuccess, modal } = useSuccessModal()

  const isDirty = name !== saved.name || description !== saved.description || JSON.stringify(q) !== JSON.stringify(saved.q)
  useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    Promise.all([
      db.rpc('ai_catalogue_for_session'),
      db.from('report_templates').select('id, template_name, primary_data_source').not('query_spec', 'is', null)
        .order('template_name').limit(200),
    ]).then(([cat, list]) => {
      setCatalogue(cat.data?.entities || [])
      setTemplates(list.data || [])
      if (cat.error) setError('The data catalogue could not be loaded.')
    })
  }, [db])

  useEffect(() => {
    if (!templateId) return
    db.from('report_templates').select('id, template_name, template_description, query_spec, created_at, updated_at, is_public')
      .eq('id', templateId).maybeSingle()
      .then(({ data, error: e }) => {
        if (e || !data) { setError('That report could not be opened.'); return }
        const loaded = fromSpec(data.query_spec)
        setTemplate(data)
        setName(data.template_name || '')
        setDescription(data.template_description || '')
        setQ(loaded)
        setSaved({ name: data.template_name || '', description: data.template_description || '', q: loaded })
        setResult(null)
      })
  }, [db, templateId])

  const entity = useMemo(() => catalogue.find((e) => e.entity === q.entity), [catalogue, q.entity])
  const fields = entity?.fields || []
  const unavailable = q.entity && catalogue.length > 0 && !entity

  const update = (patch) => setQ((prev) => ({ ...prev, ...patch }))
  const setList = (key, i, patch) => update({ [key]: q[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) })

  const run = async () => {
    setError('')
    setRunning(true)
    try {
      const { data, error: e } = await db.rpc('ai_run_query', { p_spec: { ...toSpec(q), limit: 500 } })
      if (e) throw e
      setResult(data)
    } catch (e) {
      setResult(null)
      setError(String(e?.message || e).replace(/^AIQ(_EDITION)?:\s*/, ''))
    } finally {
      setRunning(false)
    }
  }

  const save = async () => {
    if (!name.trim()) { setError('Give the report a name before saving.'); return }
    setSaving(true)
    setError('')
    const row = {
      template_name: name.trim(),
      template_description: description.trim() || null,
      template_type: 'custom',
      primary_data_source: q.entity,
      query_spec: toSpec(q),
      is_active: true,
    }
    try {
      const res = template?.id
        ? await db.from('report_templates').update(row).eq('id', template.id).select('id, template_name, created_at, updated_at').single()
        : await db.from('report_templates').insert(row).select('id, template_name, created_at, updated_at').single()
      if (res.error) throw res.error
      setTemplate((t) => ({ ...(t || {}), ...res.data }))
      setSaved({ name, description, q })
      if (!template?.id) setParams({ template: res.data.id }, { replace: true })
      showSuccess({ recordId: res.data.template_name, subject: 'Report', operation: template?.id ? 'updated' : 'created' })
    } catch (e) {
      setError(e?.message || 'The report could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Reports
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Report Builder</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pick a register, choose fields and filters, add totals, then run or save.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="rb-open" className="text-sm text-gray-600 dark:text-gray-300">Open saved</label>
          <select id="rb-open" value={templateId || ''} onChange={(e) => setParams(e.target.value ? { template: e.target.value } : {})} className={inputCls}>
            <option value="">New report</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.template_name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-2">
        <div>
          <label htmlFor="rb-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Report name</label>
          <input id="rb-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </div>
        <div>
          <label htmlFor="rb-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
          <input id="rb-desc" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </div>
      </div>

      <DetailAuditTabList tabs={TABS} activeTab={tab} onChange={setTab} ariaLabel="Report sections" />

      {unavailable && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
          This report's data source is not available. Ask your administrator to add it to the data catalogue.
        </p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {tab === 'source' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogue.map((e) => (
              <label key={e.entity} className={`cursor-pointer rounded-lg border p-3 ${q.entity === e.entity ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
                <input type="radio" name="rb-entity" className="sr-only" checked={q.entity === e.entity} onChange={() => setQ({ ...EMPTY, entity: e.entity })} />
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{e.label}</span>
                <span className="mt-0.5 block text-xs text-gray-600 dark:text-gray-400">{e.description}</span>
              </label>
            ))}
          </div>
        )}

        {tab === 'fields' && (
          entity ? (
            <>
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">Leave all unticked to use the standard columns. Fields are ignored when totals are used.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {fields.filter((f) => f.type !== 'uuid').map((f) => (
                  <label key={f.field} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <input type="checkbox" checked={q.fields.includes(f.field)}
                      onChange={(e) => update({ fields: e.target.checked ? [...q.fields, f.field] : q.fields.filter((x) => x !== f.field) })}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                    {f.label}
                  </label>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Choose a data source first.</p>
        )}

        {tab === 'filters' && (
          entity ? (
            <div className="space-y-2">
              {q.filters.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Filter field" value={f.field} onChange={(e) => setList('filters', i, { field: e.target.value })} className={inputCls}>
                    <option value="">Field…</option>
                    {fields.filter((x) => x.filter && x.type !== 'uuid').map((x) => <option key={x.field} value={x.field}>{x.label}</option>)}
                  </select>
                  <select aria-label="Condition" value={f.op} onChange={(e) => setList('filters', i, { op: e.target.value })} className={inputCls}>
                    {OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {!NO_VALUE.includes(f.op) && (
                    <input aria-label="Value" value={f.value} onChange={(e) => setList('filters', i, { value: e.target.value })} className={`${inputCls} w-48`} />
                  )}
                  <button type="button" onClick={() => update({ filters: q.filters.filter((_, j) => j !== i) })} className="p-1.5 text-red-600 hover:text-red-700" aria-label="Remove filter" title="Remove filter">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => update({ filters: [...q.filters, { field: '', op: 'eq', value: '' }] })} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                <Plus className="h-4 w-4" /> Add filter
              </button>
            </div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Choose a data source first.</p>
        )}

        {tab === 'grouping' && (
          entity ? (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">Group by</p>
                <div className="flex flex-wrap gap-3">
                  {fields.filter((x) => x.group).map((x) => (
                    <label key={x.field} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                      <input type="checkbox" checked={q.group_by.includes(x.field)}
                        onChange={(e) => update({ group_by: e.target.checked ? [...q.group_by, x.field] : q.group_by.filter((g) => g !== x.field) })}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                      {x.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Totals</p>
                {q.aggregates.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select aria-label="Total type" value={a.fn} onChange={(e) => setList('aggregates', i, { fn: e.target.value, field: e.target.value === 'count' ? '' : a.field })} className={inputCls}>
                      <option value="count">Count</option><option value="sum">Sum</option><option value="avg">Average</option>
                      <option value="min">Minimum</option><option value="max">Maximum</option>
                    </select>
                    {a.fn !== 'count' && (
                      <select aria-label="Total field" value={a.field} onChange={(e) => setList('aggregates', i, { field: e.target.value })} className={inputCls}>
                        <option value="">Field…</option>
                        {fields.filter((x) => (['sum', 'avg'].includes(a.fn) ? x.sum : ['number', 'date', 'datetime'].includes(x.type))).map((x) => <option key={x.field} value={x.field}>{x.label}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => update({ aggregates: q.aggregates.filter((_, j) => j !== i) })} className="p-1.5 text-red-600 hover:text-red-700" aria-label="Remove total" title="Remove total">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => update({ aggregates: [...q.aggregates, { fn: 'count', field: '' }] })} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                  <Plus className="h-4 w-4" /> Add total
                </button>
              </div>
            </div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Choose a data source first.</p>
        )}

        {tab === 'sorting' && (
          entity ? (
            <div className="space-y-2">
              {q.sort.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Sort field" value={s.field} onChange={(e) => setList('sort', i, { field: e.target.value })} className={inputCls}>
                    <option value="">Field…</option>
                    {(q.aggregates.length
                      ? [...q.group_by.map((g) => ({ field: g, label: fields.find((x) => x.field === g)?.label || g })),
                        ...q.aggregates.map((a) => ({ field: `${a.fn}_${a.field || 'rows'}`, label: `${a.fn} ${a.field || 'rows'}` }))]
                      : fields.filter((x) => x.type !== 'uuid').map((x) => ({ field: x.field, label: x.label }))
                    ).map((x) => <option key={x.field} value={x.field}>{x.label}</option>)}
                  </select>
                  <select aria-label="Direction" value={s.dir || 'asc'} onChange={(e) => setList('sort', i, { dir: e.target.value })} className={inputCls}>
                    <option value="asc">Ascending</option><option value="desc">Descending</option>
                  </select>
                  <button type="button" onClick={() => update({ sort: q.sort.filter((_, j) => j !== i) })} className="p-1.5 text-red-600 hover:text-red-700" aria-label="Remove sort" title="Remove sort">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => update({ sort: [...q.sort, { field: '', dir: 'asc' }] })} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                <Plus className="h-4 w-4" /> Add sort
              </button>
            </div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Choose a data source first.</p>
        )}

        {tab === 'audit' && (
          template?.id ? (
            <AuditDetailsPanel>
              <AuditCard title="Identity">
                <AuditField label="Report" value={template.template_name} />
                <AuditField label="Data source" value={entity?.label || q.entity} />
              </AuditCard>
              <AuditCard title="Classification">
                <AuditField label="Type" value="Custom report" />
                <AuditField label="Shared" value={template.is_public ? 'Yes' : 'No'} />
              </AuditCard>
              <AuditCard title="Record history">
                <AuditField label="Created" value={template.created_at ? new Date(template.created_at).toLocaleString() : null} />
                <AuditField label="Last updated" value={template.updated_at ? new Date(template.updated_at).toLocaleString() : null} />
              </AuditCard>
            </AuditDetailsPanel>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={run} disabled={!entity || running} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
          <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run report'}
        </button>
        <button type="button" onClick={save} disabled={!entity || saving || (!isDirty && Boolean(template?.id))} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save report'}
        </button>
      </div>

      {result && <AiResultTable result={result} />}
      {modal}
    </div>
  )
}
