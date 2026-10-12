/**
 * Stakeholder Engagement Page – Platform (Prioritise + Engage)
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Plus, LayoutGrid, List, Search } from 'lucide-react'
import { getStakeholders, getStakeholderEngagement, deleteStakeholderEngagement } from '../../services/stakeholderService'
import EngagementTracker from '../../components/stakeholders/EngagementTracker'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableRowNumberHeader,
  TableRowNumberCell,
} from '@nidus/ui/Table'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { engagementPlanEditPath, engagementPlanViewPath } from '@nidus/shared/utils/engagementPlanRoute'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { getDisplayRowNumber, withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'
import { platformDb } from '../../services/supabaseClient'
import StakeholderAvatar from '@nidus/ui/StakeholderAvatar'

const BOARD_LEVELS = ['unaware', 'resistant', 'neutral', 'supportive', 'leading', 'unsupportive', 'blocking']

function levelLabel(level) {
  if (!level) return '—'
  const pretty = prettySeamLevel(level)
  if (pretty !== level) return pretty
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export default function StakeholderEngagementPage() {
  const navigate = useNavigate()
  const { projects: assignedProjects, currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const [projectId, setProjectId] = useState('')
  const projects = assignedProjects.map((p) => ({
    id: p.projectId,
    project_name: p.projectName,
    project_code: p.projectCode,
  }))
  const [stakeholders, setStakeholders] = useState([])
  const [engagement, setEngagement] = useState([])
  const [view, setView] = useState('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [layout, setLayout] = useViewMode('stakeholder-engagement-planning', 'grid')
  const [deletingId, setDeletingId] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()

  useEffect(() => {
    if (projectCtxLoading || projectId || !currentProjectId) return
    setProjectId(currentProjectId)
  }, [projectCtxLoading, currentProjectId, projectId])

  useEffect(() => {
    if (projectId) {
      loadStakeholders()
      loadEngagement()
    } else {
      setStakeholders([])
      setEngagement([])
    }
  }, [projectId])

  const loadStakeholders = async () => {
    if (!projectId) return
    try {
      const data = await getStakeholders({ project_id: projectId })
      setStakeholders(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadEngagement = async () => {
    if (!projectId) return
    try {
      const data = await getStakeholderEngagement({ project_id: projectId })
      setEngagement(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const filteredEngagement = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    const list = !q
      ? engagement
      : engagement.filter((row) => {
          const name = row.stakeholder?.stakeholder_name || ''
          const haystack = [
            name,
            row.engagement_level,
            row.target_engagement_level,
            row.engagement_strategy,
          ].join(' ').toLowerCase()
          return haystack.includes(q)
        })
    return [...list].sort((a, b) => {
      const an = (a.stakeholder?.stakeholder_name || '').localeCompare(b.stakeholder?.stakeholder_name || '', undefined, { sensitivity: 'base' })
      if (an !== 0) return an
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
  }, [engagement, searchTerm])

  const sortAccessors = useMemo(() => ({
    stakeholder_name: (row) => row.stakeholder?.stakeholder_name || '',
    engagement_level: (row) => row.engagement_level || '',
    target_engagement_level: (row) => row.target_engagement_level || '',
    engagement_strategy: (row) => row.engagement_strategy || '',
    created_at: (row) => row.created_at || '',
  }), [])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'stakeholder_name', direction: 'asc' },
    storageKey: 'nidus-stakeholder-engagement-table-sort',
  })

  const sortedPlans = sortedData(filteredEngagement, sortAccessors)
  const rowNumberById = useMemo(
    () => new Map(sortedPlans.map((row, index) => [row.id, getDisplayRowNumber(index)])),
    [sortedPlans],
  )

  const byLevel = useMemo(() => {
    const groups = Object.fromEntries(BOARD_LEVELS.map((level) => [level, []]))
    for (const row of sortedPlans) {
      const level = BOARD_LEVELS.includes(row.engagement_level) ? row.engagement_level : 'neutral'
      groups[level].push(row)
    }
    return groups
  }, [sortedPlans])

  const exportColumns = [
    { key: 'stakeholder_name', label: 'Stakeholder' },
    { key: 'engagement_level', label: 'Level' },
    { key: 'target_engagement_level', label: 'Target' },
    { key: 'engagement_strategy', label: 'Strategy' },
  ]
  const exportPack = withExportRowNumbers(
    exportColumns,
    sortedPlans.map((row) => ({
      stakeholder_name: row.stakeholder?.stakeholder_name || '',
      engagement_level: levelLabel(row.engagement_level),
      target_engagement_level: levelLabel(row.target_engagement_level),
      engagement_strategy: (row.engagement_strategy || '').slice(0, 50),
    })),
  )

  const openPlan = (row, action) => {
    const path = action === 'view' ? engagementPlanViewPath(row) : engagementPlanEditPath(row)
    navigate(path, { state: { projectId } })
  }

  const handleDelete = async (row) => {
    const name = row.stakeholder?.stakeholder_name || 'this stakeholder'
    if (!window.confirm(`Remove the engagement plan for ${name}?`)) return
    setDeletingId(row.id)
    try {
      await deleteStakeholderEngagement(row.id)
      showSuccess({
        message: 'Engagement plan deleted.',
        recordId: row.engagement_reference || name,
        operation: 'deleted',
      })
      await loadEngagement()
    } catch (e) {
      alert(e?.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const planActions = (row) => (
    <div className="flex justify-end gap-1">
      <RowActionButton variant="view" label="View engagement plan" onClick={() => openPlan(row, 'view')} />
      <RowActionButton variant="edit" label="Edit engagement plan" onClick={() => openPlan(row, 'edit')} />
      <RowActionButton
        variant="delete"
        label="Delete engagement plan"
        disabled={deletingId === row.id}
        onClick={() => handleDelete(row)}
      />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {successModal}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-500" />
            Engagement Planning
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Prioritise and plan stakeholder engagement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('board')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'board' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><LayoutGrid className="h-4 w-4" /> Board</button>
          <button onClick={() => setView('tracker')} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${view === 'tracker' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}><List className="h-4 w-4" /> Tracker</button>
          <ExportListMenu
            columns={exportPack.columns}
            data={exportPack.rows}
            baseFilename="Stakeholder-Engagement"
            disabled={!sortedPlans.length}
          />
          <button onClick={() => navigate('/platform/stakeholders/engagement/new', { state: { projectId } })} disabled={!projectId} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"><Plus className="h-5 w-5" /> Add Plan</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">Select project</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.project_name} {p.project_code ? `(${p.project_code})` : ''}</option>))}
        </select>
      </div>

      {!projectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">Select a project.</div>
      ) : view === 'board' ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search engagement plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
              <ViewToggle value={layout} onChange={setLayout} ariaLabel="Engagement plan layout" />
            </div>
          </div>
          {sortedPlans.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-700 dark:text-gray-200">
              {searchTerm ? 'No engagement plans match your search.' : 'No engagement plans for this project.'}
            </div>
          ) : layout === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {BOARD_LEVELS.map(level => (
                <div key={level} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-3">{level}</h3>
                  <div className="space-y-2">
                    {byLevel[level].map(e => (
                      <div key={e.id} className="bg-white dark:bg-gray-800 rounded p-2 text-sm shadow border border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-900 dark:text-white inline-flex items-center gap-2">
                          <RowNumberBadge number={rowNumberById.get(e.id)} />
                          <StakeholderAvatar db={platformDb} stakeholder={e.stakeholder} sizeClassName="h-6 w-6" />
                          {e.stakeholder?.stakeholder_name || '—'}
                        </div>
                        <div className="text-xs text-gray-700 dark:text-gray-200">Target: {levelLabel(e.target_engagement_level)}</div>
                        {planActions(e)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                      <TableRowNumberHeader />
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('stakeholder_name')}
                        onSort={() => handleSort('stakeholder_name')}
                      >
                        Stakeholder
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('engagement_level')}
                        onSort={() => handleSort('engagement_level')}
                      >
                        Current level
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('target_engagement_level')}
                        onSort={() => handleSort('target_engagement_level')}
                      >
                        Target
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('engagement_strategy')}
                        onSort={() => handleSort('engagement_strategy')}
                      >
                        Strategy
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlans.map((row, index) => (
                      <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <StakeholderAvatar db={platformDb} stakeholder={row.stakeholder} sizeClassName="h-6 w-6" />
                            {row.stakeholder?.stakeholder_name || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200">{levelLabel(row.engagement_level)}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200">{levelLabel(row.target_engagement_level)}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200 max-w-xs truncate">{row.engagement_strategy || '—'}</TableCell>
                        <TableCell className="text-right">
                          {planActions(row)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      ) : (
        <EngagementTracker projectId={projectId} stakeholders={stakeholders} />
      )}

    </div>
  )
}
