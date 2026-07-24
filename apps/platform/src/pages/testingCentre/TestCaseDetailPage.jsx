import { useParams, Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, FlaskConical } from 'lucide-react'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

function fmtDate(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

function statusClass(status) {
  const k = (status || '').toLowerCase()
  if (k === 'ready') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  if (k === 'draft') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  if (k === 'deprecated') return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
}

function MetaItem({ label, children }) {
  return (
    <div className="min-w-0 sm:min-h-[2.5rem]">
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 break-words">{children}</dd>
    </div>
  )
}

function Section({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm ${className}`}>
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  )
}

function ProseBlock({ text }) {
  if (!text || !String(text).trim()) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 italic">Not specified</p>
  }
  return <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{text}</div>
}

export default function TestCaseDetailPage({ pathPrefix, mode }) {
  const { id } = useParams()
  const svc = mode === 'sim' ? sim : platform
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!id || !svc.getTestCase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    svc.getTestCase(id).then((r) => {
      if (cancelled) return
      if (r.success && r.data) {
        setRow(r.data)
        setErr(null)
      } else {
        setRow(null)
        setErr(r.message || 'Test case could not be loaded')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, svc])

  const steps = useMemo(() => {
    const raw = row?.test_steps
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'string') {
      try {
        const p = JSON.parse(raw)
        return Array.isArray(p) ? p : []
      } catch {
        return []
      }
    }
    return []
  }, [row])

  const testData = row?.test_data
  const tags = Array.isArray(row?.tags) ? row.tags : []

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        Loading test case…
      </div>
    )
  }

  if (err || !row) {
    return (
      <div className="p-6 max-w-3xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
          {err || 'Test case not found.'}
        </div>
        <Link to={`${pathPrefix}/cases`} className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to library
        </Link>
      </div>
    )
  }

  const mod = row.module
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <Link
          to={`${pathPrefix}/cases`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Test case library
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800">
                {row.test_case_code}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass(row.status)}`}>
                {row.status || '—'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-tight">
              {row.title}
            </h1>
          </div>
          <Link
            to={`${pathPrefix}/cases/${id}/edit`}
            className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 shadow-sm"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Summary">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetaItem label="Methodology">{row.methodology_type || '—'}</MetaItem>
            <MetaItem label="Test type">{row.test_type || '—'}</MetaItem>
            <MetaItem label="Scenario">{row.scenario_type || '—'}</MetaItem>
            <MetaItem label="Priority">{row.priority || '—'}</MetaItem>
            <MetaItem label="Severity if failed">{row.severity_if_failed || '—'}</MetaItem>
            <MetaItem label="Reusable">{row.is_reusable ? 'Yes' : 'No'}</MetaItem>
            {row.feature_name && (
              <MetaItem label="Feature">{row.feature_name}</MetaItem>
            )}
            {row.owner_role && (
              <MetaItem label="Owner role">{row.owner_role}</MetaItem>
            )}
            <MetaItem label="Last updated">{fmtDate(row.updated_at)}</MetaItem>
            <MetaItem label="Created">{fmtDate(row.created_at)}</MetaItem>
          </dl>
        </Section>

        {mod && (
          <Section title="Module">
            <div className="flex items-start gap-2">
              <FlaskConical className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{mod.name || mod.code || 'Module'}</p>
                {mod.route_path && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{mod.route_path}</p>
                )}
              </div>
            </div>
          </Section>
        )}

        <Section title="Description">
          <ProseBlock text={row.description} />
        </Section>

        <Section title="Preconditions">
          <ProseBlock text={row.preconditions} />
        </Section>

        <Section title="Test steps">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No steps recorded</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((s, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-3"
                >
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Step {s.step_no != null ? s.step_no : idx + 1}
                  </p>
                  {s.action && (
                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                      <span className="text-gray-500 dark:text-gray-400">Action: </span>
                      {s.action}
                    </p>
                  )}
                  {s.input && (
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">
                      <span className="text-gray-500 dark:text-gray-400">Input / data: </span>
                      {s.input}
                    </p>
                  )}
                  {s.expected && (
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      <span className="text-gray-500 dark:text-gray-400">Expected: </span>
                      {s.expected}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Test data">
          {!testData || (typeof testData === 'object' && Object.keys(testData).length === 0) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No structured test data</p>
          ) : (
            <pre className="text-xs font-mono p-3 rounded-lg bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
              {typeof testData === 'string' ? testData : JSON.stringify(testData, null, 2)}
            </pre>
          )}
        </Section>

        <Section title="Expected result">
          <ProseBlock text={row.expected_result} />
        </Section>

        <Section title="Automation">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {row.automation_key && (
              <MetaItem label="Automation key">{row.automation_key}</MetaItem>
            )}
            {row.playwright_spec_path && <MetaItem label="Playwright">{row.playwright_spec_path}</MetaItem>}
            {row.vitest_spec_path && <MetaItem label="Vitest">{row.vitest_spec_path}</MetaItem>}
            {row.database_test_path && <MetaItem label="Database test">{row.database_test_path}</MetaItem>}
            {!row.automation_key && !row.playwright_spec_path && !row.vitest_spec_path && !row.database_test_path && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No automation paths set</p>
            )}
          </dl>
        </Section>

        <Section title="Tags">
          {tags.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No tags</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <li
                  key={t}
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
