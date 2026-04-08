/**
 * RFPList Component
 * Filterable, sortable list of RFP documents.
 * readOnly: hide Create, Edit, Delete for non-PMO users
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit, Trash2, FileSpreadsheet, Search } from 'lucide-react'
import * as defaultRfpService from '../../services/rfpService'
import { platformDb } from '../../services/supabase/supabaseClient'
import RFPStatusBadge from './RFPStatusBadge'
import RFPStats from './RFPStats'

const RFPListRow = memo(function RFPListRow({ rfp, readOnly, deletingId, onView, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{rfp.rfp_reference}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{rfp.rfp_title}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{rfp.rfp_category || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{rfp.service_provider_name || '-'}</td>
      <td className="px-4 py-3"><RFPStatusBadge status={rfp.status} /></td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{rfp.total_line_items ?? 0}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{rfp.loaded_date || '-'}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <button onClick={() => onView(rfp.id)} className="p-2 text-gray-500 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
          {!readOnly && (
            <>
              <button onClick={() => onEdit(rfp.id)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
              <button onClick={() => onDelete(rfp.id)} disabled={deletingId === rfp.id} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
})

async function getAccountId() {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) return null
  const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single()
  if (!userRecord) return null
  const { data: owned } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).maybeSingle()
  if (owned?.id) return owned.id
  const { data: proj } = await platformDb.from('projects').select('account_id').eq('project_manager_user_id', userRecord.id).not('account_id', 'is', null).eq('is_deleted', false).limit(1).maybeSingle()
  return proj?.account_id || null
}

export default function RFPList({ readOnly = false, basePath = '/pmo', rfpService = defaultRfpService }) {
  const navigate = useNavigate()
  const { getRFPList, getRFPStats, deleteRFP } = rfpService
  const [rfps, setRfps] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accountId, setAccountId] = useState(undefined)
  const [filters, setFilters] = useState({ status: '', search: '', rfp_category: '' })
  const [searchInput, setSearchInput] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    getAccountId().then((orgId) => setAccountId(orgId ?? null))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setFilters(p => ({ ...p, search: searchInput })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const listFilters = { ...filters }
      if (accountId != null) listFilters.organisation_id = accountId

      const [listData, statsData] = await Promise.all([
        getRFPList(listFilters),
        accountId ? getRFPStats(accountId) : Promise.resolve({ total: 0, draft: 0, active: 0, closed: 0, on_hold: 0, total_line_items: 0 })
      ])
      setRfps(listData || [])
      setStats(statsData || {})
    } catch (err) {
      console.error('Error fetching RFPs:', err)
      setError(err.message || 'Failed to load RFPs')
      setRfps([])
    } finally {
      setLoading(false)
    }
  }, [filters, accountId, getRFPList, getRFPStats])

  useEffect(() => {
    if (accountId === undefined) return
    fetchData()
  }, [accountId, fetchData])

  const handleCreate = useCallback(() => navigate(`${basePath}/rfp/create`), [navigate, basePath])
  const handleView = useCallback((id) => navigate(`${basePath}/rfp/${id}/view`), [navigate, basePath])
  const handleEdit = useCallback((id) => navigate(`${basePath}/rfp/${id}/edit`), [navigate, basePath])
  const handleDelete = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this RFP? This action cannot be undone.')) return
    try {
      setDeletingId(id)
      await deleteRFP(id)
      await fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete RFP')
    } finally {
      setDeletingId(null)
    }
  }, [deleteRFP, fetchData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{basePath.includes('simulator') ? 'Practice RFP Register' : 'RFP Document Register'}</h1>
        {!readOnly && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-5 mr-2" />
            Load RFP
          </button>
        )}
      </div>

      <RFPStats stats={stats} loading={loading} />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search RFPs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading RFPs...</p>
          </div>
        </div>
      ) : rfps.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filters.search || filters.status ? 'No RFPs match your filters' : 'No RFP documents yet'}
          </p>
          {!readOnly && (
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Load First RFP
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Line Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Loaded</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rfps.map((rfp) => (
                  <RFPListRow
                    key={rfp.id}
                    rfp={rfp}
                    readOnly={readOnly}
                    deletingId={deletingId}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
