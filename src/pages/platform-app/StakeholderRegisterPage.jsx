/**
 * Stakeholder Register Page – Platform
 * Identify phase: list stakeholders, add/edit, export, project filter.
 * Optimized: shell paints immediately; data fetches deferred after first paint and run in parallel.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Users2, Upload, Search } from 'lucide-react'
import { getStakeholders } from '../../services/stakeholderService'
import StakeholderRegister from '../../components/stakeholders/StakeholderRegister'
import StakeholderImportModal from '../../components/stakeholders/StakeholderImportModal'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { platformDb } from '../../services/supabase/supabaseClient'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const EXPORT_COLUMNS = [
  { key: 'stakeholder_name', label: 'Name' },
  { key: 'stakeholder_type', label: 'Type' },
  { key: 'stakeholder_organization', label: 'Organization' },
  { key: 'email', label: 'Email' },
  { key: 'stakeholder_status', label: 'Status' },
]
const PROJECTS_LIMIT = 200
const SEARCH_DEBOUNCE_MS = 350

export default function StakeholderRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stakeholders, setStakeholders] = useState([])
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [toast, setToast] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [viewMode, setViewMode] = useViewMode('platform-stakeholder-register', 'grid')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await platformDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })
        .limit(PROJECTS_LIMIT)
      setProjects(data || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadFirst50Stakeholders = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getStakeholders({
        limit: 50,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })
      setStakeholders(data || [])
    } catch (e) {
      console.error(e)
      setLoadError(e?.message || 'Failed to load stakeholders')
      setStakeholders([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  const loadStakeholders = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getStakeholders({
        project_id: projectId,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })
      setStakeholders(data || [])
    } catch (e) {
      console.error(e)
      setLoadError(e?.message || 'Failed to load stakeholders')
      setStakeholders([])
    } finally {
      setLoading(false)
    }
  }, [projectId, debouncedSearch])

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast)
      if (projectId) loadStakeholders()
      else loadFirst50Stakeholders()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.toast, projectId, loadStakeholders, loadFirst50Stakeholders, navigate])

  // Load projects once after first paint (keeps shell fast)
  useEffect(() => {
    const raf = requestAnimationFrame(() => { loadProjects() })
    return () => cancelAnimationFrame(raf)
  }, [loadProjects])

  // Load stakeholders after first paint; re-run when project or search changes
  useEffect(() => {
    setLoading(true)
    const raf = requestAnimationFrame(() => {
      if (projectId) loadStakeholders()
      else loadFirst50Stakeholders()
    })
    return () => cancelAnimationFrame(raf)
  }, [projectId, debouncedSearch, loadStakeholders, loadFirst50Stakeholders])

  // Preload form chunk so /register/new opens fast
  useEffect(() => {
    import('./StakeholderFormPage')
  }, [])

  const exportData = useMemo(
    () =>
      stakeholders.map((s, index) => ({
        stakeholder_name: s.stakeholder_name,
        stakeholder_type: s.stakeholder_type || '',
        stakeholder_organization: s.stakeholder_organization || '',
        email: s.email || '',
        stakeholder_status: s.stakeholder_status || '',
      })),
    [stakeholders]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/platform/stakeholders/register')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users2 className="h-8 w-8 text-purple-500" />
            Stakeholder Register
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Identify and maintain stakeholder information</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={exportData}
            baseFilename="Stakeholder-Register"
            disabled={stakeholders.length === 0}
          />
          <button
            onClick={() => navigate('/platform/stakeholders/register/new', { state: { projectId: projectId || undefined } })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            aria-label="Create new stakeholder"
          >
            <Plus className="h-5 w-5" />
            Create new Stakeholder
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            aria-label="Import stakeholders"
          >
            <Upload className="h-5 w-5" />
            Import
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 p-3 rounded-lg ${toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex-1 min-w-[200px] max-w-md">
          <label htmlFor="stakeholder-register-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
          <select
            id="stakeholder-register-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
          >
            <option value="">Select project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px] max-w-md">
          <label htmlFor="stakeholder-register-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search register</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
            <input
              id="stakeholder-register-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, reference, or organization…"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
              aria-label="Search stakeholders by name, reference, or organization"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 lg:ml-auto shrink-0 pb-0.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="Stakeholder register layout"
          />
        </div>
      </div>

      <div className="space-y-0">
        {loading && (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-hidden /></div>
        )}
        {!loading && !projectId && stakeholders.length > 0 && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {debouncedSearch
              ? `Showing up to 50 stakeholders matching “${debouncedSearch}” (ordered by name). Select a project to narrow by project.`
              : 'Showing first 50 stakeholders (ordered by name). Select a project above to filter by project. Use Search register to filter by name, reference, or organization.'}
          </p>
        )}
        {!loading && projectId && debouncedSearch && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Filtered by search “{debouncedSearch}” within the selected project.
          </p>
        )}
        {!loading && (
          <StakeholderRegister
            stakeholders={stakeholders}
            loadError={loadError}
            viewMode={viewMode}
            onEdit={(s) => navigate(`/platform/stakeholders/register/edit/${s.id}`, { state: { projectId: projectId || s.project_id } })}
            onView={(s) => navigate(`/platform/stakeholders/register/view/${s.id}`)}
            onRefresh={projectId ? loadStakeholders : loadFirst50Stakeholders}
            onDeleteSuccess={(s) => setToast({ type: 'success', message: `Stakeholder "${s.stakeholder_name}" (${s.stakeholder_reference || s.id}) deleted successfully.` })}
          />
        )}
        {showImportModal && (
          <StakeholderImportModal
            projectId={projectId || undefined}
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              setShowImportModal(false)
              projectId ? loadStakeholders() : loadFirst50Stakeholders()
            }}
          />
        )}
      </div>
    </div>
  )
}
