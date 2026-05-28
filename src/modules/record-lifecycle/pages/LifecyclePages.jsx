import { useEffect, useState } from 'react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import ApprovalChainDisplay from '../../../components/ui/ApprovalChainDisplay'
import AuthorisationRequestModal from '../../../components/ui/AuthorisationRequestModal'
import RecordStatusBadge from '../../../components/ui/RecordStatusBadge'
import Button from '../../../components/ui/Button'

function useAccountId() {
  const [accountId, setAccountId] = useState(null)
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data } = await platformDb.from('users').select('account_id').eq('id', user.id).maybeSingle()
      setAccountId(data?.account_id || null)
    })()
  }, [])
  return accountId
}

export function AuthorisationQueuePage({ service, pmoView = false, title = 'Authorisation Queue' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [progress, setProgress] = useState(null)
  const accountId = useAccountId()

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const rows = await service.getAuthorisationQueue(user?.id, { pmoView })
      setItems(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pmoView])

  const openReview = async (row) => {
    const prog = await service.getApprovalProgress(row.submission_batch_id)
    setProgress(prog)
    setModal({ row, mode: 'decide' })
  }

  const handleDecision = async (decision, notes) => {
    await service.processDecision(modal.row.id, decision, notes)
    setModal(null)
    load()
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h1>
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && !items.length && <p className="text-gray-500">No pending authorisations.</p>}
      <div className="space-y-4">
        {items.map((row) => (
          <div key={row.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{row.table_name}</span>
                <span className="ml-2 text-sm text-gray-500">Level {row.approval_level}</span>
                {row.role_label && <span className="ml-2 text-sm text-gray-500">({row.role_label})</span>}
              </div>
              <RecordStatusBadge status="unauthorised" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{row.submission_notes || '—'}</p>
            {!pmoView && (
              <Button size="sm" onClick={() => openReview(row)}>Review</Button>
            )}
          </div>
        ))}
      </div>
      <AuthorisationRequestModal
        open={!!modal}
        onClose={() => setModal(null)}
        mode="decide"
        progress={progress}
        onDecision={handleDecision}
      />
    </div>
  )
}

export function PendingApprovalsPage(props) {
  return <AuthorisationQueuePage {...props} pmoView={false} title="Pending My Approval" />
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
