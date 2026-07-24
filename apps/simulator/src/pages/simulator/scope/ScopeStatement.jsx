import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { simGetScopeStatement, simSaveScopeStatement } from '../../../services/sim/simPlanningService'
import { simDb } from '../../../services/supabase/supabaseClient'
import ExportRecordButtons from '../../../components/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../../utils/exportUtils'

function linesToArr(s) {
  return (s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

function arrToLines(arr) {
  return Array.isArray(arr) ? arr.join('\n') : ''
}

const SECTIONS = [
  {
    title: 'Scope statement',
    fields: [
      { key: 'project_description', label: 'Project description' },
      { key: 'product_scope_description', label: 'Product scope' },
      { key: 'in_scope_lines', label: 'In scope (lines)' },
      { key: 'out_of_scope_lines', label: 'Out of scope (lines)' },
      { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version' },
    ],
  },
]

export default function ScopeStatement() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    project_description: '',
    product_scope_description: '',
    in_scope_lines: '',
    out_of_scope_lines: '',
    key_deliverables_lines: '',
    acceptance_lines: '',
    constraints_lines: '',
    assumptions_lines: '',
    exclusions_lines: '',
    status: 'draft',
    version: '1.0',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await simGetScopeStatement(projectId)
    if (res.success && res.data) {
      const d = res.data
      setForm({
        project_description: d.project_description || '',
        product_scope_description: d.product_scope_description || '',
        in_scope_lines: arrToLines(d.in_scope),
        out_of_scope_lines: arrToLines(d.out_of_scope),
        key_deliverables_lines: arrToLines(d.key_deliverables),
        acceptance_lines: arrToLines(d.acceptance_criteria),
        constraints_lines: arrToLines(d.constraints),
        assumptions_lines: arrToLines(d.assumptions),
        exclusions_lines: arrToLines(d.exclusions),
        status: d.status || 'draft',
        version: d.version || '1.0',
      })
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const save = async (asDraft) => {
    if (!projectId || !canEdit) return
    setSaving(true)
    setSuccess(null)
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const res = await simSaveScopeStatement(
        projectId,
        {
          project_description: form.project_description,
          product_scope_description: form.product_scope_description,
          in_scope: linesToArr(form.in_scope_lines),
          out_of_scope: linesToArr(form.out_of_scope_lines),
          key_deliverables: linesToArr(form.key_deliverables_lines),
          acceptance_criteria: linesToArr(form.acceptance_lines),
          constraints: linesToArr(form.constraints_lines),
          assumptions: linesToArr(form.assumptions_lines),
          exclusions: linesToArr(form.exclusions_lines),
          status: asDraft ? 'draft' : form.status,
          version: form.version,
        }
      )
      if (!res.success) throw new Error(res.error)
      setSuccess({
        op: res.operation,
        id: res.data?.id,
        message: `Scope statement ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
      })
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  const exportFlat = {
    ...form,
    in_scope: form.in_scope_lines,
    out_of_scope: form.out_of_scope_lines,
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Scope statement</span>
      </nav>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scope statement</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Define scope (Process Guide 5.4).</p>
        </div>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportWord={() => exportRecordToWord(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportExcel={() => exportRecordToExcel(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportCSV={() => exportRecordToCSV(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportXML={() => exportRecordToXML(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportJSON={() => exportRecordToJSON(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
          onExportPrint={() => exportRecordToPrint(SECTIONS, exportFlat, `ScopeStatement_${projectId}`)}
        />
      </div>
      {success?.message && (
        <div className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">{success.error}</div>}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {[
          ['project_description', 'Project description'],
          ['product_scope_description', 'Product scope description'],
        ].map(([k, lab]) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{lab}</label>
            <textarea
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              disabled={!canEdit}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
        ))}
        {[
          ['in_scope_lines', 'In scope (one per line)'],
          ['out_of_scope_lines', 'Out of scope (one per line)'],
          ['key_deliverables_lines', 'Key deliverables (one per line)'],
          ['acceptance_lines', 'Acceptance criteria (one per line)'],
          ['constraints_lines', 'Constraints (one per line)'],
          ['assumptions_lines', 'Assumptions (one per line)'],
          ['exclusions_lines', 'Exclusions (one per line)'],
        ].map(([k, lab]) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{lab}</label>
            <textarea
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              disabled={!canEdit}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="draft">draft</option>
              <option value="approved">approved</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Version</label>
            <input
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-lg border border-gray-400 px-4 py-2 text-sm dark:border-gray-500 dark:text-gray-200"
            >
              Save as draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
