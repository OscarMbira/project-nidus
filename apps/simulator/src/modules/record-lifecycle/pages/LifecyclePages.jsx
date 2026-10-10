import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import ApprovalChainDisplay from '@nidus/ui/ApprovalChainDisplay'
import Button from '@nidus/ui/Button'
import { RowActionButton } from '@nidus/ui'
import { deleteDecision } from '../../../services/decisionLogService'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'

function RequestStatusPill({ status }) {
  const approved = status === 'approved'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      approved
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
    }`}>
      {approved ? 'Approved' : 'Pending'}
    </span>
  )
}

function formatDecidedAt(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function useAccountId() {
  const [searchParams] = useSearchParams()
  const projectKey = searchParams.get('projectId')
  const [accountId, setAccountId] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return

      const { data: userRow } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .maybeSingle()
      if (!userRow?.id) return

      if (projectKey) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectKey)
        const scopedQuery = platformDb.from('projects').select('account_id').eq('is_deleted', false)
        const { data: scoped } = isUuid
          ? await scopedQuery.eq('id', projectKey).maybeSingle()
          : await scopedQuery.eq('project_code', projectKey).maybeSingle()
        if (!cancelled && scoped?.account_id) {
          setAccountId(scoped.account_id)
          return
        }
      }

      const { data: accountRow } = await platformDb
        .from('accounts')
        .select('id')
        .eq('owner_user_id', userRow.id)
        .eq('is_deleted', false)
        .maybeSingle()
      if (accountRow?.id) {
        if (!cancelled) setAccountId(accountRow.id)
        return
      }

      const { data: proj } = await platformDb
        .from('projects')
        .select('account_id')
        .eq('owner_user_id', userRow.id)
        .not('account_id', 'is', null)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()
      if (proj?.account_id) {
        if (!cancelled) setAccountId(proj.account_id)
        return
      }

      const { data: membership } = await platformDb
        .from('project_memberships')
        .select('project_id')
        .eq('user_id', userRow.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (!membership?.project_id) return
      const { data: memberProject } = await platformDb
        .from('projects')
        .select('account_id')
        .eq('id', membership.project_id)
        .maybeSingle()
      if (!cancelled) setAccountId(memberProject?.account_id || null)
    })()
    return () => { cancelled = true }
  }, [projectKey])
  return accountId
}

const QUEUE_EXPORT_COLUMNS = [
  { key: 'table_name', label: 'Record' },
  { key: 'approval_level', label: 'Level' },
  { key: 'role_label', label: 'Role' },
  { key: 'status_label', label: 'Status' },
  { key: 'submission_notes', label: 'Submission' },
  { key: 'decision_notes', label: 'Decision' },
  { key: 'decided_at_label', label: 'Decided' },
]

function queueStatusLabel(status) {
  if (status === 'approved') return 'Approved'
  if (status === 'pending') return 'Pending'
  return status || ''
}

export function AuthorisationQueuePage({ service, pmoView = false, title = 'Authorisation Queue' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [viewMode, setViewMode] = useViewMode(pmoView ? 'authorisation-queue-pmo' : 'pending-my-approval', 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'table_name', direction: 'asc' },
    storageKey: pmoView ? 'authorisation-queue-pmo-sort' : 'pending-my-approval-sort',
  })

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const rows = await service.getAuthorisationQueue(user?.id, {
        pmoView,
        statuses: pmoView ? ['pending'] : ['pending', 'approved'],
      })
      setItems(rows || [])
    } catch (err) {
      toast.error(err?.message || 'Failed to load authorisations')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pmoView])

  const openReview = (row) => {
    const base = location.pathname.replace(/\/$/, '')
    navigate({ pathname: `${base}/${row.id}`, search: location.search })
  }

  const recordPaths = (row) => {
    const q = location.search || ''
    if (row.table_name === 'project_decisions' && row.record_id) {
      const base = `/simulator/governance/decisions/${row.record_id}`
      return { view: `${base}${q}`, edit: `${base}/edit${q}` }
    }
    return { view: null, edit: null }
  }

  const openSource = (row, mode) => {
    const paths = recordPaths(row)
    const target = mode === 'edit' ? paths.edit : paths.view
    if (target) navigate(target)
    else openReview(row)
  }

  const deleteSource = async (row) => {
    if (row.table_name !== 'project_decisions' || !row.record_id) return
    if (!window.confirm('Delete this decision?')) return
    try {
      await deleteDecision(row.record_id)
      setItems((prev) => prev.filter((item) => item.id !== row.id))
      showSuccess({ recordId: row.table_name, operation: 'deleted', message: 'Decision deleted.' })
    } catch (err) {
      toast.error(err?.message || 'Could not delete this record')
    }
  }

  const queueActions = (row, { showReview }) => {
    const paths = recordPaths(row)
    return (
      <div className="inline-flex items-center gap-1 justify-end">
        <RowActionButton variant="view" label="View record" onClick={() => openSource(row, 'view')} />
        {paths.edit && (
          <RowActionButton variant="edit" label="Edit record" onClick={() => openSource(row, 'edit')} />
        )}
        {paths.edit && (
          <RowActionButton variant="delete" label="Delete record" onClick={() => deleteSource(row)} />
        )}
        {showReview && <Button size="sm" onClick={() => openReview(row)}>Review</Button>}
      </div>
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dated = [...items].sort((a, b) => String(a.submitted_at || '').localeCompare(String(b.submitted_at || '')))
    if (!q) return dated
    return dated.filter((row) =>
      [row.table_name, row.role_label, row.submission_notes, row.decision_notes, queueStatusLabel(row.status)]
        .some((value) => String(value || '').toLowerCase().includes(q))
    )
  }, [items, search])

  const sortAccessors = useMemo(() => ({
    table_name: (row) => row.table_name || '',
    approval_level: (row) => Number(row.approval_level) || 0,
    role_label: (row) => row.role_label || '',
    status_label: (row) => queueStatusLabel(row.status),
    submission_notes: (row) => row.submission_notes || '',
    decision_notes: (row) => row.decision_notes || '',
    decided_at: (row) => row.decided_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pending = sorted.filter((row) => row.status === 'pending')
  const approved = sorted.filter((row) => row.status === 'approved')
  const exportRows = sorted.map((row) => ({
    ...row,
    status_label: queueStatusLabel(row.status),
    decided_at_label: formatDecidedAt(row.decided_at) || '',
  }))

  const renderCard = (row, index, { showReview }) => {
    const decidedAt = formatDecidedAt(row.decided_at)
    return (
      <div key={row.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <RowNumberBadge number={getDisplayRowNumber(index)} />
            <span className="font-medium text-gray-900 dark:text-white">{row.table_name}</span>
            <span className="text-sm text-gray-700 dark:text-gray-200">Level {row.approval_level}</span>
            {row.role_label && <span className="text-sm text-gray-700 dark:text-gray-200">({row.role_label})</span>}
          </div>
          <RequestStatusPill status={row.status} />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{row.submission_notes || '—'}</p>
        {row.status === 'approved' && (
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
            {row.decision_notes || 'Approved'}
            {decidedAt ? ` · ${decidedAt}` : ''}
          </p>
        )}
        {queueActions(row, { showReview })}
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={QUEUE_EXPORT_COLUMNS} data={exportRows} baseFilename="PendingMyApproval" />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search authorisations..."
        className="mb-4 w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
      {loading && <p className="text-gray-500 dark:text-gray-300">Loading…</p>}
      {!loading && !sorted.length && (
        <p className="text-gray-700 dark:text-gray-200">{search.trim() ? 'No authorisations match this search.' : 'No authorisations yet.'}</p>
      )}
      {!loading && sorted.length > 0 && viewMode === 'list' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('table_name')} onSort={() => handleSort('table_name')} className="!normal-case whitespace-nowrap">Record</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('approval_level')} onSort={() => handleSort('approval_level')} className="!normal-case whitespace-nowrap">Level</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('role_label')} onSort={() => handleSort('role_label')} className="!normal-case whitespace-nowrap">Role</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status_label')} onSort={() => handleSort('status_label')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('submission_notes')} onSort={() => handleSort('submission_notes')} className="!normal-case whitespace-nowrap">Submission</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('decision_notes')} onSort={() => handleSort('decision_notes')} className="!normal-case whitespace-nowrap">Decision</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('decided_at')} onSort={() => handleSort('decided_at')} className="!normal-case whitespace-nowrap">Decided</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, index) => (
                <TableRow key={row.id}>
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <TableCell className="text-gray-900 dark:text-white font-medium">{row.table_name}</TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-200">{row.approval_level}</TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-200">{row.role_label || '—'}</TableCell>
                  <TableCell><RequestStatusPill status={row.status} /></TableCell>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 max-w-xs whitespace-normal">{row.submission_notes || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 max-w-xs whitespace-normal">{row.decision_notes || '—'}</td>
                  <TableCell className="text-gray-700 dark:text-gray-200 whitespace-nowrap">{formatDecidedAt(row.decided_at) || '—'}</TableCell>
                  <TableCell className="text-right">
                    {queueActions(row, { showReview: row.status === 'pending' && !pmoView })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!loading && sorted.length > 0 && viewMode === 'grid' && (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Waiting for your approval</h2>
              <div className="space-y-4">
                {pending.map((row) => renderCard(row, sorted.indexOf(row), { showReview: !pmoView }))}
              </div>
            </section>
          )}
          {approved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Already approved</h2>
              <div className="space-y-4">
                {approved.map((row) => renderCard(row, sorted.indexOf(row), { showReview: false }))}
              </div>
            </section>
          )}
        </div>
      )}
      {successModal}
    </div>
  )
}

export function PendingApprovalsPage(props) {
  return <AuthorisationQueuePage {...props} pmoView={false} title="Pending My Approval" />
}

export function AuthorisationReviewPage({ service }) {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [row, setRow] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [decided, setDecided] = useState(false)
  const { confirmBack } = useUnsavedChangesGuard(notes.trim().length > 0 && !decided)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const request = await service.getAuthorisationRequest(requestId)
        if (cancelled) return
        setRow(request)
        if (!request) return
        const prog = await service.getApprovalProgress(request.submission_batch_id)
        if (cancelled) return
        setProgress(prog)
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Failed to load this authorisation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [requestId, service])

  const leave = () => confirmBack()

  const handleDecision = async (decision) => {
    if (!row || !notes.trim()) return
    setSaving(true)
    try {
      await service.processDecision(row.id, decision, notes.trim())
      setDecided(true)
      showSuccess({
        recordId: row.table_name,
        operation: 'updated',
        message: decision === 'approve' ? 'Submission approved.' : 'Submission rejected.',
        onOk: () => {
          if (window.history.state?.nidusUnsavedGuard) window.history.go(-2)
          else navigate(-1)
        },
      })
    } catch (err) {
      toast.error(err?.message || 'Failed to record the decision')
    } finally {
      setSaving(false)
    }
  }

  const canDecide = notes.trim().length > 0 && !saving

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 max-w-3xl text-gray-900 dark:text-gray-100">
      <button
        type="button"
        onClick={leave}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold mb-2">Review Authorisation</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Review the record, then approve or reject with a mandatory justification.
      </p>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : !row ? (
        <p className="text-gray-500">This authorisation request was not found.</p>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
          <ApprovalChainDisplay progress={progress} />
          <div>
            <label htmlFor="authorisation-notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Justification (required)
            </label>
            <textarea
              id="authorisation-notes"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm"
              rows={4}
              placeholder="Explain why you are approving or rejecting this submission…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={leave}>Cancel</Button>
            <Button variant="danger" disabled={!canDecide} onClick={() => handleDecision('reject')}>Reject</Button>
            <Button variant="primary" disabled={!canDecide} onClick={() => handleDecision('approve')}>Approve</Button>
          </div>
        </div>
      )}
      {successModal}
    </div>
  )
}

export function MySubmittedRecordsPage({ service, title = 'My Submitted Records' }) {
  const [items, setItems] = useState([])
  const [progressMap, setProgressMap] = useState({})

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      const rows = await service.getSubmittedRecords(user?.id)
      setItems(rows)
      const map = {}
      for (const r of rows) {
        if (r.submission_batch_id) {
          map[r.submission_batch_id] = await service.getApprovalProgress(r.submission_batch_id)
        }
      }
      setProgressMap(map)
    })()
  }, [service])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      {!items.length && <p className="text-gray-500">No submitted records.</p>}
      <div className="space-y-6">
        {items.map((row) => (
          <div key={row.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
            <div className="font-medium text-gray-900 dark:text-white mb-2">{row.table_name} — {row.record_id?.slice(0, 8)}</div>
            <ApprovalChainDisplay progress={progressMap[row.submission_batch_id]} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LifecycleDashboardPage({ service, title = 'Lifecycle Dashboard' }) {
  const accountId = useAccountId()
  const [configs, setConfigs] = useState([])

  useEffect(() => {
    if (!accountId) return
    service.listLifecycleConfigs(accountId).then(setConfigs).catch(() => setConfigs([]))
  }, [accountId, service])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
            <div className="font-medium text-gray-900 dark:text-white">{c.table_name}</div>
            <p className="text-sm text-gray-500 mt-1">Approval: {c.approval_enabled ? 'On' : 'Off'}</p>
            <p className="text-sm text-gray-500">Mode: {c.level_approval_mode}</p>
            <p className="text-sm text-gray-500">History retention: {c.history_retention_days ?? 'Indefinite'} days</p>
          </div>
        ))}
        {!configs.length && <p className="text-gray-500">No lifecycle rules configured yet.</p>}
      </div>
    </div>
  )
}

export function ConfigureLifecycleRulesPage({ service, title = 'Configure Lifecycle Rules' }) {
  const accountId = useAccountId()
  const [tableName, setTableName] = useState('risks')
  const [config, setConfig] = useState({ approvalEnabled: true, levelApprovalMode: 'any', historyRetentionDays: 365, autoArchiveEnabled: false })
  const [saved, setSaved] = useState(null)

  const save = async () => {
    if (!accountId) return
    await service.saveLifecycleConfig(accountId, null, tableName, config)
    setSaved({ tableName, op: 'saved' })
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-green-800 dark:text-green-200 text-sm">
          Saved lifecycle rules for <strong>{saved.tableName}</strong>.
        </div>
      )}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Table</label>
      <select
        className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
      >
        {['risks', 'issues', 'change_requests', 'tasks', 'defects', 'projects', 'business_cases'].map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={config.approvalEnabled} onChange={(e) => setConfig({ ...config, approvalEnabled: e.target.checked })} />
        Approval enabled
      </label>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level approval mode</label>
      <select
        className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2"
        value={config.levelApprovalMode}
        onChange={(e) => setConfig({ ...config, levelApprovalMode: e.target.value })}
      >
        <option value="any">Any one at each level</option>
        <option value="all">All at each level</option>
      </select>
      <label className="flex items-center gap-2 mb-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={config.autoArchiveEnabled} onChange={(e) => setConfig({ ...config, autoArchiveEnabled: e.target.checked })} />
        Auto-archive from History
      </label>
      <input
        type="number"
        className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2"
        placeholder="History retention (days)"
        value={config.historyRetentionDays ?? ''}
        onChange={(e) => setConfig({ ...config, historyRetentionDays: Number(e.target.value) || null })}
      />
      <Button onClick={save}>Save</Button>
    </div>
  )
}

export function ApprovalChainsOverviewPage({ service, title = 'Approval Chains' }) {
  const accountId = useAccountId()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!accountId) return
    service.listAllAuthorisers(accountId).then(setRows).catch(() => setRows([]))
  }, [accountId, service])

  const grouped = rows.reduce((acc, r) => {
    const key = `${r.table_name}:${r.project_id || 'org'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      {Object.entries(grouped).map(([key, chain]) => (
        <div key={key} className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
          <div className="font-medium text-gray-900 dark:text-white mb-2">{key}</div>
          <ApprovalChainDisplay chain={chain.map((r) => ({
            level: r.approval_level,
            roleLabel: r.role_label,
            fullName: r.authoriser?.full_name || r.authoriser_user_id,
            status: 'waiting',
          }))} />
        </div>
      ))}
      {!rows.length && <p className="text-gray-500">No approval chains configured.</p>}
    </div>
  )
}

export function ArchiveRetentionRulesPage({ service, title = 'Archive Retention Rules' }) {
  const accountId = useAccountId()
  const [overrides, setOverrides] = useState([])

  const load = () => {
    if (!accountId) return
    service.listArchiveOverrides(accountId).then(setOverrides).catch(() => setOverrides([]))
  }

  useEffect(load, [accountId, service])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
        Settings on this page override all project and org-level retention config for the selected table.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4">Table</th>
              <th className="py-2 pr-4">History days</th>
              <th className="py-2 pr-4">Regulatory ref</th>
              <th className="py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-900 dark:text-white">{o.table_name}</td>
                <td className="py-2 pr-4">{o.history_retention_days ?? '—'}</td>
                <td className="py-2 pr-4">{o.regulatory_reference || '—'}</td>
                <td className="py-2">{o.override_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!overrides.length && <p className="text-gray-500 mt-4">No archive overrides configured.</p>}
      </div>
    </div>
  )
}

export function ArchiveVaultPage({ service, title = 'Archive Vault' }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  const runSearch = async () => {
    const data = await service.searchArchiveVault(search)
    setResults(data)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2"
          placeholder="Search archived records…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={runSearch}>Search</Button>
      </div>
      {results.map((r) => (
        <div key={r.tableName} className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="font-medium text-gray-900 dark:text-white">{r.label}</div>
          <p className="text-sm text-gray-500">{r.records?.length || 0} archived records</p>
        </div>
      ))}
    </div>
  )
}
