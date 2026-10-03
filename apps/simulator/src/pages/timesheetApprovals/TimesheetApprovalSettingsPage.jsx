/**
 * Timesheet Approval Settings — Simulator mirror (v963 Phase 19, GAP-13).
 * See apps/platform/src/pages/timesheetApprovals/TimesheetApprovalSettingsPage.jsx.
 * Route: /simulator/pmo/settings/timesheet-approvals
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { simDb } from '@nidus/supabase'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  listApprovalSettings,
  createApprovalSettings,
  updateApprovalSettings,
  deleteApprovalSettings,
} from '../../services/timesheetPeriodService'

const APPROVER_ROLES = ['project_manager', 'team_lead', 'pmo_admin']

const defaultForm = { approver_role: 'project_manager', escalation_days: 3, auto_approve: false }

export default function TimesheetApprovalSettingsPage() {
  const [accountId, setAccountId] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const { showSuccess, modal: successModal } = useSuccessModal()

  const load = useCallback(async (accId) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listApprovalSettings({ accountId: accId })
      setItems(rows)
    } catch (e) {
      setError(e?.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      await load(id)
    })()
  }, [load])

  useEffect(() => {
    if (formTab !== 'audit' || !editing) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(simDb, [editing.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, editing])

  const handleAdd = () => {
    setEditing(null)
    setForm(defaultForm)
    setFormTab('details')
    setShowForm(true)
  }

  const handleEdit = (row) => {
    setEditing(row)
    setForm({ approver_role: row.approver_role, escalation_days: row.escalation_days, auto_approve: row.auto_approve })
    setFormTab('details')
    setShowForm(true)
  }

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this approval setting?')) return
    try {
      await deleteApprovalSettings(row.id)
      await load(accountId)
    } catch (e) {
      setError(e?.message || 'Delete failed')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
    setForm(defaultForm)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        account_id: accountId,
        approver_role: form.approver_role,
        escalation_days: Number(form.escalation_days) || 0,
        auto_approve: !!form.auto_approve,
      }
      const saved = editing ? await updateApprovalSettings(editing.id, payload) : await createApprovalSettings(payload)
      setShowForm(false)
      setEditing(null)
      await load(accountId)
      showSuccess({ recordId: saved.id, operation: editing ? 'updated' : 'created', message: 'Timesheet approval setting saved.' })
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Timesheet Approval Settings</h1>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Setting
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Approver role, escalation days, and auto-approve rules for the weekly practice timesheet workflow.
        </p>

        {error && <p className="text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editing ? 'Edit Setting' : 'Add Setting'}</h2>
            <div className="mb-4">
              <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
            </div>

            {formTab === 'audit' ? (
              !editing ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this setting is saved.</p>
              ) : (
                <AuditDetailsPanel description="How this approval setting is configured and tracked.">
                  <AuditCard title="Identity" description="Which approver role this setting applies to.">
                    <AuditField label="Approver role" value={humanizeAuditToken(form.approver_role)} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Escalation and automation behaviour.">
                    <AuditField label="Escalation days" value={form.escalation_days} />
                    <AuditField label="Auto-approve" value={form.auto_approve ? 'Yes' : 'No'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this setting was created and last changed.">
                    <AuditField label="Created by" value={editing.created_by ? auditUserLabels[editing.created_by] || null : null} />
                    <AuditTimestampPair dateLabel="Created at" value={editing.created_at} />
                    <AuditTimestampPair dateLabel="Last updated" value={editing.updated_at} />
                  </AuditCard>
                </AuditDetailsPanel>
              )
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approver role</span>
                  <select
                    value={form.approver_role}
                    onChange={(e) => setForm((f) => ({ ...f, approver_role: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  >
                    {APPROVER_ROLES.map((r) => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Escalation days</span>
                  <input
                    type="number"
                    min={0}
                    value={form.escalation_days}
                    onChange={(e) => setForm((f) => ({ ...f, escalation_days: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.auto_approve}
                    onChange={(e) => setForm((f) => ({ ...f, auto_approve: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-approve after escalation window</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                    {editing ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No approval settings configured. The default (project_manager, 3-day escalation) applies.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approver role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Escalation (days)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Auto-approve</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 capitalize">{row.approver_role.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.escalation_days}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.auto_approve ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <RowActionButton variant="edit" label="Edit setting" onClick={() => handleEdit(row)} />
                        <RowActionButton variant="delete" label="Delete setting" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {successModal}
      </div>
    </div>
  )
}
