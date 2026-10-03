import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { useSuccessModal } from '../../../hooks/useSuccessModal'
import { simGetScopeStatement, simSaveScopeStatement } from '../../../services/sim/simPlanningService'
import { listAssumptions, deleteAssumption } from '../../../services/assumptionService'
import { listConstraints, deleteConstraint } from '../../../services/constraintService'
import { simDb } from '../../../services/supabase/supabaseClient'
import ExportRecordButtons from '../../../components/ui/ExportRecordButtons'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../../utils/exportUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

const RAID_STATUS_BADGE = {
  active: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  open: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  validated: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  resolved: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  managed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  invalidated: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  closed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
}
const RAID_IMPACT_BADGE = {
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  high: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
}

function RaidBadge({ value, map }) {
  if (!value) return <span className="text-gray-400 dark:text-gray-500">—</span>
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${map[value] || map.low || map.open}`}>
      {value}
    </span>
  )
}

/** Embedded live view into the Assumptions/Constraints Register (v1100) — "+ Add" and the edit
 * icon navigate to that register's own existing Create/Edit pages rather than duplicating form
 * logic inside the Scope Statement page. */
function RegisterMiniTable({ rows, loading, addLabel, onAdd, onView, onEdit, onDelete, dateLabel, canEdit, emptyLabel, itemLabel }) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <TableRowNumberHeader />
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{itemLabel}</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Owner</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{dateLabel}</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Impact</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id} className="group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-sm truncate">{row.text}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.owner?.full_name || '—'}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-3 text-sm"><RaidBadge value={row.impact} map={RAID_IMPACT_BADGE} /></td>
                  <td className="px-3 py-3 text-sm"><RaidBadge value={row.status} map={RAID_STATUS_BADGE} /></td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <RowActionButton variant="view" label={`View ${itemLabel.toLowerCase()}`} onClick={() => onView(row)} />
                      {canEdit && <RowActionButton variant="edit" label={`Edit ${itemLabel.toLowerCase()}`} onClick={() => onEdit(row)} />}
                      {canEdit && <RowActionButton variant="delete" label={`Remove ${itemLabel.toLowerCase()}`} onClick={() => onDelete(row)} />}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  )
}

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

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'in_scope', label: 'In scope' },
  { value: 'out_of_scope', label: 'Out of scope' },
  { value: 'key_deliverables', label: 'Key deliverables' },
  { value: 'acceptance', label: 'Acceptance criteria' },
  { value: 'constraints', label: 'Constraints' },
  { value: 'assumptions', label: 'Assumptions' },
  { value: 'boundaries', label: 'Boundaries' },
  { value: 'audit', label: 'Audit details' },
]

export default function ScopeStatement() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const { showSuccess, modal } = useSuccessModal()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [record, setRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [assumptions, setAssumptions] = useState([])
  const [assumptionsLoading, setAssumptionsLoading] = useState(true)
  const [constraints, setConstraints] = useState([])
  const [constraintsLoading, setConstraintsLoading] = useState(true)
  const [form, setForm] = useState({
    project_description: '',
    product_scope_description: '',
    in_scope_lines: '',
    out_of_scope_lines: '',
    key_deliverables_lines: '',
    acceptance_lines: '',
    exclusions_lines: '',
    status: 'draft',
    version: '1.0',
  })

  const reloadAssumptions = useCallback(async () => {
    if (!projectId) return
    setAssumptionsLoading(true)
    const res = await listAssumptions(projectId)
    setAssumptions(res.data || [])
    setAssumptionsLoading(false)
  }, [projectId])

  const reloadConstraints = useCallback(async () => {
    if (!projectId) return
    setConstraintsLoading(true)
    const res = await listConstraints(projectId)
    setConstraints(res.data || [])
    setConstraintsLoading(false)
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [res] = await Promise.all([
      simGetScopeStatement(projectId),
      reloadAssumptions(),
      reloadConstraints(),
    ])
    if (res.success && res.data) {
      const d = res.data
      setRecord(d)
      setForm({
        project_description: d.project_description || '',
        product_scope_description: d.product_scope_description || '',
        in_scope_lines: arrToLines(d.in_scope),
        out_of_scope_lines: arrToLines(d.out_of_scope),
        key_deliverables_lines: arrToLines(d.key_deliverables),
        acceptance_lines: arrToLines(d.acceptance_criteria),
        exclusions_lines: arrToLines(d.exclusions),
        status: d.status || 'draft',
        version: d.version || '1.0',
      })
    }
    setLoading(false)
  }, [projectId, reloadAssumptions, reloadConstraints])

  useEffect(() => {
    load()
  }, [load])

  const handleDeleteAssumption = async (row) => {
    if (!window.confirm('Remove this assumption from the register?')) return
    const res = await deleteAssumption(row.id)
    if (!res.success) {
      toast.error(res.error || 'Failed to remove assumption')
      return
    }
    reloadAssumptions()
  }

  const handleDeleteConstraint = async (row) => {
    if (!window.confirm('Remove this constraint from the register?')) return
    const res = await deleteConstraint(row.id)
    if (!res.success) {
      toast.error(res.error || 'Failed to remove constraint')
      return
    }
    reloadConstraints()
  }

  const save = async (asDraft) => {
    if (!projectId || !canEdit) return
    setSaving(true)
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
          exclusions: linesToArr(form.exclusions_lines),
          status: asDraft ? 'draft' : form.status,
          version: form.version,
        }
      )
      if (!res.success) throw new Error(res.error)
      setRecord(res.data)
      showSuccess({
        recordId: form.version,
        operation: res.operation === 'created' ? 'created' : 'updated',
        message: `Scope statement ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
      })
    } catch (e) {
      toast.error(e.message || 'Failed to save scope statement')
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

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <DetailAuditTabList
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Scope statement sections"
          tabs={TABS}
        />
      </div>

      {activeTab === 'audit' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this statement is saved.</p>
          ) : (
            <AuditDetailsPanel description="When this scope statement was created and last changed.">
              <AuditCard title="Identity" description="How this statement is versioned.">
                <AuditField label="Version" value={record.version} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this statement sits.">
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this statement was created and last changed.">
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            {activeTab === 'overview' && (
              <div className="space-y-4">
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
              </div>
            )}

            {activeTab === 'in_scope' && (
              <MultiLineListInput
                viewModeId="scope-statement-in-scope"
                id="scope_statement_in_scope"
                value={form.in_scope_lines}
                onChange={(v) => setForm((f) => ({ ...f, in_scope_lines: v }))}
                placeholder="e.g. Migrate core banking data to the new platform"
                ariaLabelPrefix="in-scope item"
                itemColumnLabel="In scope"
                disabled={!canEdit}
              />
            )}

            {activeTab === 'out_of_scope' && (
              <MultiLineListInput
                viewModeId="scope-statement-out-of-scope"
                id="scope_statement_out_of_scope"
                value={form.out_of_scope_lines}
                onChange={(v) => setForm((f) => ({ ...f, out_of_scope_lines: v }))}
                placeholder="e.g. Mobile app redesign (separate initiative)"
                ariaLabelPrefix="out-of-scope item"
                itemColumnLabel="Out of scope"
                disabled={!canEdit}
              />
            )}

            {activeTab === 'key_deliverables' && (
              <MultiLineListInput
                viewModeId="scope-statement-key-deliverables"
                id="scope_statement_key_deliverables"
                value={form.key_deliverables_lines}
                onChange={(v) => setForm((f) => ({ ...f, key_deliverables_lines: v }))}
                placeholder="e.g. User acceptance test sign-off report"
                ariaLabelPrefix="deliverable"
                itemColumnLabel="Key deliverable"
                disabled={!canEdit}
              />
            )}

            {activeTab === 'acceptance' && (
              <MultiLineListInput
                viewModeId="scope-statement-acceptance-criteria"
                id="scope_statement_acceptance"
                value={form.acceptance_lines}
                onChange={(v) => setForm((f) => ({ ...f, acceptance_lines: v }))}
                placeholder="e.g. All P1 defects resolved before go-live"
                ariaLabelPrefix="acceptance criterion"
                itemColumnLabel="Acceptance criterion"
                disabled={!canEdit}
              />
            )}

            {activeTab === 'constraints' && (
              <RegisterMiniTable
                loading={constraintsLoading}
                canEdit={canEdit}
                itemLabel="Constraint"
                dateLabel="Due date"
                emptyLabel="None recorded."
                addLabel="Add constraint"
                rows={constraints.map((c) => ({
                  id: c.id, text: c.constraint_text, owner: c.owner, date: c.due_date,
                  impact: c.impact_severity, status: c.status,
                }))}
                onAdd={() => navigate(`/simulator/practice-projects/${projectId}/constraints/create`)}
                onView={(row) => navigate(`/simulator/practice-projects/${projectId}/constraints/${row.id}`)}
                onEdit={(row) => navigate(`/simulator/practice-projects/${projectId}/constraints/${row.id}/edit`)}
                onDelete={(row) => handleDeleteConstraint(row)}
              />
            )}

            {activeTab === 'assumptions' && (
              <RegisterMiniTable
                loading={assumptionsLoading}
                canEdit={canEdit}
                itemLabel="Assumption"
                dateLabel="Next review date"
                emptyLabel="None recorded."
                addLabel="Add assumption"
                rows={assumptions.map((a) => ({
                  id: a.id, text: a.assumption_text, owner: a.owner, date: a.next_review_date,
                  impact: a.impact_severity, status: a.validation_status,
                }))}
                onAdd={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/create`)}
                onView={(row) => navigate(`/simulator/practice-projects/${projectId}/assumptions/${row.id}`)}
                onEdit={(row) => navigate(`/simulator/practice-projects/${projectId}/assumptions/${row.id}/edit`)}
                onDelete={(row) => handleDeleteAssumption(row)}
              />
            )}

            {activeTab === 'boundaries' && (
              <MultiLineListInput
                viewModeId="scope-statement-boundaries"
                id="scope_statement_boundaries"
                value={form.exclusions_lines}
                onChange={(v) => setForm((f) => ({ ...f, exclusions_lines: v }))}
                placeholder="e.g. Support for legacy Windows XP clients"
                ariaLabelPrefix="boundary"
                itemColumnLabel="Boundary"
                disabled={!canEdit}
              />
            )}
          </div>

          {activeTab === 'overview' && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
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
                <div className="flex gap-2 pt-4">
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
          )}
        </>
      )}
      {modal}
    </div>
  )
}
