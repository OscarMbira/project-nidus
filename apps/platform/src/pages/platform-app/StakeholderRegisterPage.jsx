/**
 * Stakeholder Register Page – Platform
 * Identify phase: list stakeholders, add/edit, export, project filter.
 * Optimized: shell paints immediately; data fetches deferred after first paint and run in parallel.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Users2, Upload, Search, UserCheck, AlertCircle } from 'lucide-react'
import { getStakeholders } from '../../services/stakeholderService'
import StakeholderRegister from '../../components/stakeholders/StakeholderRegister'
import StakeholderImportModal from '../../components/stakeholders/StakeholderImportModal'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import ViewToggle from '@nidus/ui/ViewToggle'
import { DashboardRegisterTabBar, DashboardStatCard, RegisterOpenItemsWidget } from '@nidus/ui'
import { platformDb } from '../../services/supabaseClient'
import StakeholderAvatar from '@nidus/ui/StakeholderAvatar'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useCurrentProject } from '../../lib/CurrentProjectContext'

const EXPORT_COLUMNS = [
  { key: 'stakeholder_reference', label: 'Record ID' },
  { key: 'stakeholder_name', label: 'Name' },
  { key: 'stakeholder_type', label: 'Type' },
  { key: 'stakeholder_organization', label: 'Organization' },
  { key: 'email', label: 'Email' },
  { key: 'stakeholder_status', label: 'Status' },
]
const SEARCH_DEBOUNCE_MS = 350

const REGISTER_FOCUS_LABELS = {
  active: 'Active',
  internal: 'Internal',
  external: 'External',
  decision: 'Decision makers',
  influencer: 'Influencers',
}

function titleCase(value) {
  const text = String(value || '').trim()
  if (!text) return '—'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function stakeholderTypeBadgeClass(type) {
  switch ((type || '').toLowerCase()) {
    case 'internal':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'external':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'customer':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'supplier':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'regulator':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

function StakeholderTypeCell({ stakeholder }) {
  return (
    <div>
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${stakeholderTypeBadgeClass(stakeholder.stakeholder_type)}`}>
        {stakeholder.stakeholder_type || 'N/A'}
      </span>
      {stakeholder.is_decision_maker && (
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Decision Maker</div>
      )}
      {stakeholder.is_influencer && (
        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Influencer</div>
      )}
    </div>
  )
}

function stakeholderMatchesFocus(stakeholder, focus) {
  if (focus === 'active') return (stakeholder.stakeholder_status || 'active') === 'active'
  if (focus === 'internal') return (stakeholder.stakeholder_type || '').toLowerCase() === 'internal'
  if (focus === 'external') return (stakeholder.stakeholder_type || '').toLowerCase() === 'external'
  if (focus === 'decision') return !!stakeholder.is_decision_maker
  if (focus === 'influencer') return !!stakeholder.is_influencer
  return true
}

export default function StakeholderRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projects: assignedProjects, currentProjectId, currentProject, setCurrentProject, loading: projectCtxLoading } = useCurrentProject()
  const [stakeholders, setStakeholders] = useState([])
  const projects = assignedProjects.map((p) => ({
    id: p.projectId,
    project_name: p.projectName,
    project_code: p.projectCode,
  }))
  const [projectId, setProjectId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [toast, setToast] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pageTab, setPageTab] = useState('dashboard') // 'dashboard' | 'register'
  const [registerFocus, setRegisterFocus] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-stakeholder-register', 'list')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadStakeholders = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getStakeholders({
        project_id: projectId,
        limit: 500,
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
    if (projectCtxLoading) return
    if (!currentProjectId) return
    setProjectId((prev) => (prev === currentProjectId ? prev : currentProjectId))
  }, [currentProjectId, projectCtxLoading])

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast)
      if (projectId) loadStakeholders()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.toast, projectId, loadStakeholders, navigate])

  // Load stakeholders for the current project only
  useEffect(() => {
    if (projectCtxLoading || !projectId) {
      if (!projectCtxLoading && !projectId && !currentProjectId) {
        setStakeholders([])
        setLoading(false)
      }
      return
    }
    setLoading(true)
    const raf = requestAnimationFrame(() => { loadStakeholders() })
    return () => cancelAnimationFrame(raf)
  }, [projectId, debouncedSearch, projectCtxLoading, currentProjectId, loadStakeholders])

  // Preload form chunk so /register/new opens fast
  useEffect(() => {
    import('./StakeholderFormPage')
  }, [])

  const dashboardStats = useMemo(() => {
    const byType = {}
    let active = 0
    let decisionMakers = 0
    let influencers = 0
    for (const s of stakeholders) {
      const t = (s.stakeholder_type || 'other').toLowerCase()
      byType[t] = (byType[t] || 0) + 1
      if ((s.stakeholder_status || 'active') === 'active') active += 1
      if (s.is_decision_maker) decisionMakers += 1
      if (s.is_influencer) influencers += 1
    }
    return {
      total: stakeholders.length,
      active,
      internal: byType.internal || 0,
      external: byType.external || 0,
      decisionMakers,
      influencers,
    }
  }, [stakeholders])

  const registerRows = useMemo(
    () => stakeholders.filter((s) => stakeholderMatchesFocus(s, registerFocus)),
    [stakeholders, registerFocus]
  )

  const exportData = useMemo(
    () =>
      registerRows.map((s) => ({
        stakeholder_reference: s.stakeholder_reference || '',
        stakeholder_name: s.stakeholder_name,
        stakeholder_type: s.stakeholder_type || '',
        stakeholder_organization: s.stakeholder_organization || '',
        email: s.email || '',
        stakeholder_status: s.stakeholder_status || '',
      })),
    [registerRows]
  )

  const keyStakeholders = useMemo(
    () => stakeholders.filter((s) => s.is_decision_maker || s.is_influencer),
    [stakeholders]
  )

  const notYetPrioritised = useMemo(
    () => stakeholders.filter((s) => s.is_affected_by_project && !s.is_decision_maker && !s.is_influencer),
    [stakeholders]
  )

  const openRegister = (focus = '') => {
    setRegisterFocus(focus)
    setPageTab('register')
  }

  const projectOptions = useMemo(() => {
    const rows = [...projects]
    if (currentProject && !rows.some((p) => p.id === currentProject.projectId)) {
      rows.unshift({
        id: currentProject.projectId,
        project_name: currentProject.projectName,
        project_code: currentProject.projectCode,
      })
    }
    return rows
  }, [projects, currentProject])

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (pageTab === 'register') {
                  setRegisterFocus('')
                  setPageTab('dashboard')
                  return
                }
                const projectKey = currentProject?.projectCode || currentProjectId || projectId
                navigate(projectKey ? `/pm/dashboard?projectId=${encodeURIComponent(projectKey)}` : '/pm/dashboard')
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shrink-0"
              aria-label={pageTab === 'register' ? 'Back to stakeholder dashboard' : 'Back to project dashboard'}
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users2 className="h-7 w-7 text-purple-500 shrink-0" />
                Stakeholder Register
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Identify and maintain stakeholder information
              </p>
            </div>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Stakeholder register sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <ExportListMenu
              columns={EXPORT_COLUMNS}
              data={exportData}
              baseFilename="Stakeholder-Register"
              disabled={registerRows.length === 0}
            />
            <button
              type="button"
              onClick={() => navigate('/platform/stakeholders/register/new', { state: { projectId: projectId || undefined } })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium min-h-[44px]"
              aria-label="Create new stakeholder"
            >
              <Plus className="h-5 w-5" />
              Create new Stakeholder
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium min-h-[44px]"
              aria-label="Import stakeholders"
            >
              <Upload className="h-5 w-5" />
              Import
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className={`mb-4 p-3 rounded-lg ${toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
          {toast.message}
        </div>
      )}

      {pageTab === 'dashboard' && (
        <div className="space-y-6" role="tabpanel" aria-label="Stakeholder dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total', value: dashboardStats.total, focus: '', accent: 'text-gray-900 dark:text-white' },
              { label: 'Active', value: dashboardStats.active, focus: 'active', accent: 'text-emerald-700 dark:text-emerald-300' },
              { label: 'Internal', value: dashboardStats.internal, focus: 'internal', accent: 'text-blue-700 dark:text-blue-300' },
              { label: 'External', value: dashboardStats.external, focus: 'external', accent: 'text-purple-700 dark:text-purple-300' },
              { label: 'Decision makers', value: dashboardStats.decisionMakers, focus: 'decision', accent: 'text-sky-700 dark:text-sky-300' },
              { label: 'Influencers', value: dashboardStats.influencers, focus: 'influencer', accent: 'text-amber-700 dark:text-amber-300' },
            ].map((card) => (
              <DashboardStatCard
                key={card.label}
                label={card.label}
                value={loading ? '—' : card.value}
                accentClassName={card.accent}
                onClick={() => openRegister(card.focus)}
              />
            ))}
          </div>

          <RegisterOpenItemsWidget
            title="People who can move this project"
            icon={UserCheck}
            rows={keyStakeholders}
            loading={loading}
            storageKey="stakeholder-register-key-people"
            columns={[
              {
                key: 'stakeholder_name',
                label: 'Name',
                className: 'font-medium text-gray-900 dark:text-gray-100',
                render: (s) => (
                  <span className="inline-flex items-center gap-2">
                    <StakeholderAvatar db={platformDb} stakeholder={s} sizeClassName="h-7 w-7" />
                    {s.stakeholder_name}
                  </span>
                ),
              },
              {
                key: 'project_role',
                label: 'Role on this project',
                render: (s) => s.project_role || s.stakeholder_title || '—',
              },
              { key: 'stakeholder_organization', label: 'Organisation', render: (s) => s.stakeholder_organization || '—' },
              {
                key: 'stakeholder_type',
                label: 'Type',
                className: 'whitespace-normal',
                sortAccessor: (s) => [
                  s.stakeholder_type || '',
                  s.is_decision_maker ? 'Decision Maker' : '',
                  s.is_influencer ? 'Influencer' : '',
                ].filter(Boolean).join(' '),
                render: (s) => <StakeholderTypeCell stakeholder={s} />,
              },
              { key: 'interest_level', label: 'Interest', render: (s) => titleCase(s.interest_level) },
              {
                key: 'why',
                label: 'Why they matter',
                sortAccessor: (s) => (s.is_decision_maker ? 'Decision maker' : 'Influencer'),
                render: (s) => (s.is_decision_maker ? 'Decision maker' : 'Influencer'),
              },
            ]}
            rowKey={(s) => s.id}
            searchFields={['stakeholder_name', 'project_role', 'stakeholder_organization']}
            onRowClick={(s) => navigate(`/platform/stakeholders/register/view/${s.id}`)}
            onViewAll={() => openRegister('')}
            viewAllLabel="Open the full register"
            emptyMessage="No decision makers or influencers yet. Mark them on each stakeholder so this list shows who to engage first."
          />

          <RegisterOpenItemsWidget
            title="Affected, but not yet prioritised"
            icon={AlertCircle}
            rows={notYetPrioritised}
            loading={loading}
            storageKey="stakeholder-register-not-prioritised"
            columns={[
              {
                key: 'stakeholder_name',
                label: 'Name',
                className: 'font-medium text-gray-900 dark:text-gray-100',
                render: (s) => (
                  <span className="inline-flex items-center gap-2">
                    <StakeholderAvatar db={platformDb} stakeholder={s} sizeClassName="h-7 w-7" />
                    {s.stakeholder_name}
                  </span>
                ),
              },
              {
                key: 'project_role',
                label: 'Role on this project',
                render: (s) => s.project_role || s.stakeholder_title || '—',
              },
              { key: 'stakeholder_organization', label: 'Organisation', render: (s) => s.stakeholder_organization || '—' },
              { key: 'interest_level', label: 'Interest', render: (s) => titleCase(s.interest_level) },
              {
                key: 'reach',
                label: 'How to reach them',
                sortAccessor: (s) => s.email || s.phone || s.mobile || '',
                render: (s) => s.email || s.phone || s.mobile || 'No contact yet',
              },
            ]}
            rowKey={(s) => s.id}
            searchFields={['stakeholder_name', 'project_role', 'stakeholder_organization', 'email']}
            onRowClick={(s) => navigate(`/platform/stakeholders/register/view/${s.id}`)}
            onViewAll={() => openRegister('')}
            viewAllLabel="Open the full register"
            emptyMessage="Everyone the project affects is already marked as a decision maker or an influencer."
          />
        </div>
      )}

      {pageTab === 'register' && (
      <div role="tabpanel" aria-label="Stakeholder register">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex-1 min-w-[200px] max-w-md">
          <label htmlFor="stakeholder-register-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
          <select
            id="stakeholder-register-project"
            value={projectId}
            onChange={(e) => {
              const next = e.target.value
              setProjectId(next)
              if (next) setCurrentProject(next)
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
          >
            {!projectId && <option value="">Select project</option>}
            {projectOptions.map(p => (
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
        {!loading && !projectId && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Select the current project to see its stakeholders.
          </p>
        )}
        {!loading && projectId && debouncedSearch && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Filtered by search “{debouncedSearch}” within the selected project.
          </p>
        )}
        {!loading && registerFocus && (
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {REGISTER_FOCUS_LABELS[registerFocus]} only
            </span>
            <button type="button" onClick={() => setRegisterFocus('')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Clear
            </button>
          </div>
        )}
        {!loading && (
          <StakeholderRegister
            stakeholders={registerRows}
            loadError={loadError}
            viewMode={viewMode}
            projectId={projectId}
            onEdit={(s) => navigate(`/platform/stakeholders/register/edit/${s.id}`, { state: { projectId: projectId || s.project_id } })}
            onView={(s) => navigate(`/platform/stakeholders/register/view/${s.id}`)}
            onRefresh={loadStakeholders}
            onDeleteSuccess={(s) => setToast({ type: 'success', message: `Stakeholder "${s.stakeholder_name}" (${s.stakeholder_reference || s.id}) deleted successfully.` })}
          />
        )}
      </div>
      </div>
      )}

      {showImportModal && (
        <StakeholderImportModal
          projectId={projectId || undefined}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false)
            if (projectId) loadStakeholders()
          }}
        />
      )}
    </div>
  )
}
