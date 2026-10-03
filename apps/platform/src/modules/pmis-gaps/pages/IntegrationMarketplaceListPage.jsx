/**
 * Integrations Marketplace — browsable catalog of available integration types (GAP-25, v963
 * Phase 21). Rules 40/41/44/61/38. Card view is the default (rule 41's own exception for
 * genuinely card-first/gallery content — this is a discovery surface, not a dense register).
 *
 * Complementary to, and separate from, the existing "configured connectors" feature
 * (Integrations.jsx / IntegrationConfig.jsx / IntegrationSync.jsx on public.integrations) — not
 * touched here. "Connect" marks a lightweight connection-status row (integration_connections)
 * then hands off into the real IntegrationConfig.jsx flow for actual credential/sync setup.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plug, Plus, LayoutGrid, List as ListIcon, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import RowNumberBadge from '../../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
import { getSessionPMOAdminStatus } from '../../../services/pmoAdminService'
import {
  listCatalog,
  deleteCatalogEntry,
  listConnectionsForAccount,
  connectIntegration,
  getCurrentUserAccountId,
} from '../services/integrationCatalogService'

const STATUS_BADGE = {
  connected: { label: 'Connected', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', Icon: CheckCircle2 },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', Icon: AlertCircle },
  disconnected: { label: 'Not connected', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', Icon: XCircle },
}

function ConnectionBadge({ status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.disconnected
  const Icon = meta.Icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${meta.className}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  )
}

export default function IntegrationMarketplaceListPage({ basePath = '/pm/integrations', configBasePath = '/platform/integrations' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [connections, setConnections] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [viewMode, setViewMode] = useViewMode('integration-marketplace', 'grid')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'integration_name', direction: 'asc' },
    storageKey: 'integration-marketplace-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [acctId, { isPMOAdmin }] = await Promise.all([getCurrentUserAccountId(), getSessionPMOAdminStatus()])
    setAccountId(acctId)
    setIsAdmin(!!isPMOAdmin)
    const [catalogRows, connectionRows] = await Promise.all([
      listCatalog(),
      acctId ? listConnectionsForAccount(acctId) : Promise.resolve([]),
    ])
    setCatalog(catalogRows)
    setConnections(connectionRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const connectionByIntegrationId = useMemo(() => {
    const map = new Map()
    connections.forEach((c) => map.set(c.integration_id, c))
    return map
  }, [connections])

  const categories = useMemo(() => [...new Set(catalog.map((r) => r.category).filter(Boolean))].sort(), [catalog])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog.filter((r) => {
      if (category && r.category !== category) return false
      if (!q) return true
      return r.integration_name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q)
    })
  }, [catalog, search, category])

  const sortAccessors = useMemo(
    () => ({
      integration_name: (r) => r.integration_name || '',
      category: (r) => r.category || '',
      is_available: (r) => (r.is_available ? 1 : 0),
    }),
    []
  )
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'integration_name', label: 'Integration' },
    { key: 'category', label: 'Category' },
    { key: 'is_available', label: 'Available' },
    { key: 'is_coming_soon', label: 'Coming soon' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove "${row.integration_name}" from the integrations catalog?`)) return
    try {
      await deleteCatalogEntry(row.id)
      showSuccess({ recordId: row.integration_name, operation: 'deleted', message: `"${row.integration_name}" was removed from the catalog.` })
      load()
    } catch (err) {
      window.alert(err?.message || 'Could not delete this catalog entry. You may need PMO admin permissions.')
    }
  }

  const handleConnect = async (row) => {
    try {
      if (accountId) {
        await connectIntegration({ accountId, integrationId: row.id })
        setConnections((prev) => {
          const next = prev.filter((c) => c.integration_id !== row.id)
          next.push({ integration_id: row.id, connection_status: 'connected' })
          return next
        })
      }
    } catch {
      // Non-fatal: still hand off to the real configure flow even if the marketplace's own
      // lightweight status marker failed to write (e.g. RLS edge case) — the actual
      // credential/sync setup below is the feature that matters.
    }
    navigate(`${configBasePath}/create?type=${encodeURIComponent(row.integration_code)}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading integrations marketplace…</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Plug className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations Marketplace</h1>
        </div>
        {isAdmin && (
          <button onClick={() => navigate(`${basePath}/catalog/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Integration
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Browse available integration types, then Connect to configure credentials and sync.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="IntegrationsMarketplace" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No integrations found.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('integration_name')} onSort={() => handleSort('integration_name')} className="!normal-case whitespace-nowrap">Integration</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category')} onSort={() => handleSort('category')} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => {
                  const connection = connectionByIntegrationId.get(row.id)
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {row.integration_name}
                        {row.is_coming_soon && <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Coming soon</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.category}</td>
                      <td className="px-4 py-3"><ConnectionBadge status={connection?.connection_status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {row.is_available && !row.is_coming_soon && (
                            <button onClick={() => handleConnect(row)} className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white">
                              {connection?.connection_status === 'connected' ? 'Reconfigure' : 'Connect'}
                            </button>
                          )}
                          <RowActionButton variant="view" label="View integration" onClick={() => navigate(`${basePath}/catalog/${row.id}`)} />
                          {isAdmin && <RowActionButton variant="edit" label="Edit integration" onClick={() => navigate(`${basePath}/catalog/${row.id}/edit`)} />}
                          {isAdmin && <RowActionButton variant="delete" label="Delete integration" onClick={() => handleDelete(row)} />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row, index) => {
              const connection = connectionByIntegrationId.get(row.id)
              return (
                <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    <ConnectionBadge status={connection?.connection_status} />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{row.integration_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{row.category}</div>
                  {row.description && <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{row.description}</p>}
                  {row.is_coming_soon && <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Coming soon</span>}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {row.is_available && !row.is_coming_soon && (
                      <button onClick={() => handleConnect(row)} className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white">
                        {connection?.connection_status === 'connected' ? 'Reconfigure' : 'Connect'}
                      </button>
                    )}
                    <RowActionButton variant="view" label="View integration" onClick={() => navigate(`${basePath}/catalog/${row.id}`)} />
                    {isAdmin && <RowActionButton variant="edit" label="Edit integration" onClick={() => navigate(`${basePath}/catalog/${row.id}/edit`)} />}
                    {isAdmin && <RowActionButton variant="delete" label="Delete integration" onClick={() => handleDelete(row)} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
