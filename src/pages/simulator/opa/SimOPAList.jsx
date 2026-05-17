import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, PauseCircle } from 'lucide-react'
import { listOPAs } from '../../../services/sim/simOPAService'
import { listSimulationRunsForPicker } from '../../../services/sim/simProjectOPATailoringService'
import { ensureEefOpaSampleForAccount } from '../../../services/eefService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import ViewToggle from '../../../components/ui/ViewToggle'
import { useViewMode } from '../../../hooks/useViewMode'
import { useSortableTable } from '../../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'

const COLS = [
  { key: 'title', label: 'Title' },
  { key: 'opa_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'is_on_hold', label: 'On hold' },
  { key: 'updated_at', label: 'Updated' },
]

export default function SimOPAList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templateOnly = searchParams.get('type') === 'template'
  const [accountId, setAccountId] = useState(null)
  const [contextReady, setContextReady] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedErr, setSeedErr] = useState(null)
  const [listVersion, setListVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [deb, setDeb] = useState('')
  const [viewMode, setViewMode] = useViewMode('sim-opa-list', 'list')
  const [practiceProjects, setPracticeProjects] = useState([])
  const [pickOpaId, setPickOpaId] = useState(null)
  const [pickProjectId, setPickProjectId] = useState('')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-sim-opa-sort',
  })
  const acc = useMemo(
    () => ({
      title: (r) => r.title ?? '',
      opa_type: (r) => r.opa_type ?? '',
      status: (r) => r.status ?? '',
      version: (r) => r.version ?? '',
      is_on_hold: (r) => (r.is_on_hold ? 'Yes' : 'No'),
      updated_at: (r) => r.updated_at ?? '',
    }),
    []
  )
  const displayRows = useMemo(() => sortedData(rows, acc), [rows, sortedData, acc])
  const ex = useMemo(() => displayRows.map((r) => ({ ...r, is_on_hold: r.is_on_hold ? 'Yes' : 'No' })), [displayRows])

  useEffect(() => {
    const t = setTimeout(() => setDeb(search), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => {
    let c = false
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!c) {
        setAccountId(id)
        setContextReady(true)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    if (!contextReady || !accountId) {
      if (contextReady && !accountId) setLoading(false)
      return
    }
    let c = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      setSeedErr(null)
      const { data, error } = await listOPAs(accountId, {
        search: deb,
        opaType: templateOnly ? 'template' : null,
      })
      if (c) return
      if (error) {
        setErr(error.message || 'Failed to load OPA list.')
        setRows([])
        setLoading(false)
        return
      }
      setRows(data || [])
      setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [contextReady, accountId, deb, listVersion, templateOnly])

  useEffect(() => {
    if (!templateOnly) return
    ;(async () => {
      const { data } = await listSimulationRunsForPicker()
      setPracticeProjects(
        (data || []).map((r) => ({
          id: r.id,
          project_name: r.scenario_id ? `Practice run ${r.id.slice(0, 8)}` : r.id.slice(0, 8),
        }))
      )
    })()
  }, [templateOnly])

  async function handleLoadSampleData() {
    if (!accountId) return
    setSeedErr(null)
    setSeedLoading(true)
    const { data, error } = await ensureEefOpaSampleForAccount(accountId)
    setSeedLoading(false)
    if (error) {
      setSeedErr(error.message || 'Could not load sample data.')
      return
    }
    if (data && typeof data === 'object' && data.success === false && data.error) {
      setSeedErr(String(data.error))
      return
    }
    setListVersion((v) => v + 1)
  }

  const base = '/simulator/opa'

  function openUseInProject(opaId) {
    setPickOpaId(opaId)
    setPickProjectId('')
  }

  function confirmUseInProject() {
    if (!pickProjectId || !pickOpaId) return
    navigate(`/simulator/practice-projects/${pickProjectId}/opa-templates/new?from_opa=${pickOpaId}`)
    setPickOpaId(null)
  }

  if (!contextReady) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-600 dark:text-gray-400">
        <p>Loading organisation…</p>
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>No organisation context found. Use the same account you use for Platform projects.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {templateOnly ? 'Simulator — OPA Templates' : 'Simulator — Process Assets'}
        </h1>
        <div className="flex gap-2">
          <ExportListMenu columns={COLS} data={ex} baseFilename="Sim_OPA" disabled={!ex.length} />
          {!templateOnly && (
            <>
              <Link to={`${base}/on-hold`} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[44px] inline-flex items-center gap-1">
                <PauseCircle className="h-4 w-4" /> Drafts
              </Link>
              <Link to={`${base}/bulk-upload`} className="px-4 py-2 rounded-lg border min-h-[44px]">
                Bulk
              </Link>
              <Link to={`${base}/new`} className="px-4 py-2 rounded-lg bg-sky-600 text-white inline-flex items-center gap-1">
                <Plus className="h-5 w-5" /> Add
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      {err && <p className="text-red-600 dark:text-red-400 mb-4">{err}</p>}
      {seedErr && <p className="text-red-600 dark:text-red-400 mb-4">{seedErr}</p>}
      {loading || seedLoading ? (
        <p className="text-gray-500 dark:text-gray-400">{seedLoading ? 'Loading sample…' : 'Loading…'}</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {displayRows.map((r) => (
            <div key={r.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button type="button" className="font-semibold text-left" onClick={() => navigate(`${base}/${r.id}`)}>
                {r.title}
              </button>
              <div className="mt-2 flex gap-2 text-sm">
                <button type="button" className="text-sky-600" onClick={() => navigate(`${base}/${r.id}`)}>
                  <Eye className="inline h-4 w-4" /> View
                </button>
                {!templateOnly && (
                  <button type="button" onClick={() => navigate(`${base}/${r.id}/edit`)}>
                    <Pencil className="inline h-4 w-4" /> Edit
                  </button>
                )}
                {templateOnly && (
                  <button type="button" className="text-violet-600" onClick={() => openUseInProject(r.id)}>
                    Use in project →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')}>
                  Title
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('opa_type')} onSort={() => handleSort('opa_type')}>
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.opa_type}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-sky-600 text-sm" onClick={() => navigate(`${base}/${r.id}`)}>
                      View
                    </button>
                    {!templateOnly && (
                      <button type="button" className="text-sm" onClick={() => navigate(`${base}/${r.id}/edit`)}>
                        Edit
                      </button>
                    )}
                    {templateOnly && (
                      <button type="button" className="text-sm text-violet-600" onClick={() => openUseInProject(r.id)}>
                        Use in project →
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pickOpaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Use template in practice project</h2>
            <select
              value={pickProjectId}
              onChange={(e) => setPickProjectId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 mb-4 min-h-[44px]"
            >
              <option value="">Select practice project</option>
              {practiceProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 border rounded-lg" onClick={() => setPickOpaId(null)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 bg-sky-600 text-white rounded-lg" onClick={confirmUseInProject} disabled={!pickProjectId}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !seedLoading && !displayRows.length && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 space-y-4 max-w-lg mx-auto">
          <p>No OPA records yet. Add your own or load the starter sample (adds both EEF and OPA in sim).</p>
          <button
            type="button"
            onClick={handleLoadSampleData}
            disabled={seedLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium min-h-[44px] disabled:opacity-50"
          >
            {seedLoading ? 'Loading sample…' : 'Load sample EEF & OPA'}
          </button>
        </div>
      )}
    </div>
  )
}
