/**
 * Teams Module
 * Team and resource management
 * Route: /platform/teams
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users,
  Search,
  Plus,
  Building2,
  Calendar,
  BarChart3,
  UserSearch,
  Eye,
} from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getAllTeams, getTeamsForProject, getResourceDirectory, updateResourceDirectoryEntry, deleteTeam } from '../../services/teamService'
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
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const TEAM_EXPORT_COLUMNS = [
  { key: 'team_code', label: 'Team code' },
  { key: 'team_name', label: 'Team name' },
  { key: 'team_type', label: 'Type' },
  { key: 'team_lead', label: 'Team Manager/Lead' },
  { key: 'team_description', label: 'Description' },
  { key: 'max_team_size', label: 'Max size' },
  { key: 'status', label: 'Status' },
]

function RecordPeek({ title, fields, onClose }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <button type="button" onClick={onClose} className="text-sm font-medium text-gray-900 underline dark:text-white">Close</button>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-700 dark:text-gray-200">{field.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{field.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function RowCrudActions({ canChange, onView, onEdit, name }) {
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      <RowActionButton variant="view" label={`View ${name}`} onClick={onView} />
      {canChange ? <RowActionButton variant="edit" label={`Edit ${name}`} onClick={onEdit} /> : null}
    </div>
  )
}

function teamRouteId(team) {
  return (team?.team_code && String(team.team_code).trim()) || team?.id
}

function teamLeadLabel(team) {
  const lead = team?.team_lead
  if (!lead) return ''
  if (lead.full_name && lead.email) return `${lead.full_name}`
  return lead.full_name || lead.email || ''
}

export default function Teams() {
  const navigate = useNavigate()
  const { projectId: routeProjectId, routeKey, loading: projectLoading } = usePlatformProjectId()
  const { currentProjectId, currentProject, loading: ctxLoading } = useCurrentProject()
  const projectId = currentProjectId || routeProjectId
  const createProjectKey = routeKey || currentProject?.projectCode || projectId
  const createPath = createProjectKey
    ? `/platform/teams/create?projectId=${encodeURIComponent(createProjectKey)}`
    : '/platform/teams/create'

  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState(null)
  const [teams, setTeams] = useState([])
  const [resources, setResources] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [directoryView, setDirectoryView] = useState(null)
  const [editingDirectory, setEditingDirectory] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-teams', 'list')
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const { showSuccess, modal } = useSuccessModal()

  useEffect(() => {
    loadOrganization()
  }, [projectId])

  useEffect(() => {
    if (projectLoading || ctxLoading) return
    if (activeTab === 'teams') {
      loadTeams()
    } else if (activeTab === 'directory' && organizationId) {
      loadResources()
    }
  }, [organizationId, activeTab, projectId, projectLoading, ctxLoading])

  const loadOrganization = async () => {
    try {
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (!user) {
        navigate('/auth/login')
        return
      }

      const { data: signedInUser } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      setCurrentUserId(signedInUser?.id || null)

      if (projectId) {
        const { data: currentProj } = await platformDb
          .from('projects')
          .select('account_id')
          .eq('id', projectId)
          .eq('is_deleted', false)
          .maybeSingle()
        if (currentProj?.account_id) {
          setOrganizationId(currentProj.account_id)
          return
        }
      }

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (userRecord) {
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .maybeSingle()

        if (account) {
          setOrganizationId(account.id)
        } else {
          const { data: project } = await platformDb
            .from('projects')
            .select('account_id')
            .eq('owner_user_id', userRecord.id)
            .eq('is_deleted', false)
            .limit(1)
            .maybeSingle()

          if (project?.account_id) {
            setOrganizationId(project.account_id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      setLoading(true)
      if (projectId) {
        const result = await getTeamsForProject(projectId)
        if (result.success) {
          setTeams(result.data || [])
          return
        }
        console.error('getTeamsForProject failed:', result.error)
        toast.error(result.error || 'Failed to load teams for this project')
      }
      if (!organizationId) {
        if (!projectId) setTeams([])
        return
      }
      const result = await getAllTeams(organizationId)
      if (result.success) {
        setTeams(result.data || [])
      } else {
        toast.error(result.error || 'Failed to load teams')
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error(error.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const loadResources = async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      const result = await getResourceDirectory(organizationId, { search: searchTerm })
      if (result.success) {
        setResources(result.data || [])
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const beginEditDirectory = (resource) => {
    setDirectoryView(null)
    setEditingDirectory({
      id: resource.id,
      full_name: resource.full_name || 'Resource',
      job_title: resource.job_title || '',
      department: resource.department || '',
      phone_number: resource.phone_number || '',
    })
  }

  const handleSaveDirectory = async () => {
    if (!editingDirectory?.id) return
    const res = await updateResourceDirectoryEntry(editingDirectory.id, editingDirectory)
    if (!res.success) {
      toast.error(res.error || 'Failed to update resource')
      return
    }
    showSuccess({
      recordId: editingDirectory.full_name,
      operation: 'updated',
      message: 'Resource details updated.',
    })
    setEditingDirectory(null)
    loadResources()
  }

  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    const list = !q
      ? teams
      : teams.filter(
          (team) =>
            team.team_name?.toLowerCase().includes(q) ||
            team.team_description?.toLowerCase().includes(q) ||
            team.team_code?.toLowerCase().includes(q) ||
            teamLeadLabel(team).toLowerCase().includes(q),
        )
    return [...list].sort((a, b) => {
      const an = (a.team_name || '').localeCompare(b.team_name || '', undefined, { sensitivity: 'base' })
      if (an !== 0) return an
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
  }, [teams, searchTerm])

  const {
    handleSort,
    getSortDirectionForColumn,
    sortedData,
  } = useSortableTable({
    defaultSort: { column: 'team_name', direction: 'asc' },
    storageKey: 'nidus-platform-teams-table-sort',
  })

  const teamSortAccessors = useMemo(
    () => ({
      team_code: (t) => t.team_code || '',
      team_name: (t) => t.team_name || '',
      team_type: (t) => t.team_type || '',
      team_lead: (t) => teamLeadLabel(t),
      max_team_size: (t) => t.max_team_size ?? 0,
      status: (t) => (t.is_active ? 'Active' : 'Inactive'),
      created_at: (t) => t.created_at || '',
    }),
    [],
  )

  const sortedTeams = sortedData(filteredTeams, teamSortAccessors)

  const exportRows = useMemo(
    () =>
      sortedTeams.map((t) => ({
        team_code: t.team_code || '',
        team_name: t.team_name || '',
        team_type: t.team_type || '',
        team_lead: teamLeadLabel(t) || '—',
        team_description: t.team_description || '',
        max_team_size: t.max_team_size ?? '',
        status: t.is_active ? 'Active' : 'Inactive',
      })),
    [sortedTeams],
  )

  useEffect(() => {
    if (!sortedTeams.length) {
      setSelectedTeamId(null)
      return
    }
    if (!selectedTeamId || !sortedTeams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(sortedTeams[0].id)
    }
  }, [sortedTeams, selectedTeamId])

  const filteredResources = resources.filter(
    (resource) =>
      resource.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.job_title?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openTeam = (team) => {
    if (!team) return
    navigate(`/platform/teams/${encodeURIComponent(teamRouteId(team))}`)
  }

  const openTeamEdit = (team) => {
    if (!team) return
    navigate(`/platform/teams/${encodeURIComponent(teamRouteId(team))}/edit`)
  }

  const handleDeleteTeam = async (team) => {
    if (!team?.id) return
    if (
      !window.confirm(
        `Delete team “${team.team_name}”? This removes it from the active teams list.`,
      )
    ) {
      return
    }
    const res = await deleteTeam(team.id)
    if (!res.success) {
      toast.error(res.error || 'Failed to delete team')
      return
    }
    setTeams((prev) => prev.filter((t) => t.id !== team.id))
    showSuccess({
      recordId: teamRouteId(team),
      operation: 'deleted',
      message: `Team “${team.team_name}” was deleted.`,
    })
  }

  const handleToolbarView = () => {
    const team = sortedTeams.find((t) => t.id === selectedTeamId) || sortedTeams[0]
    openTeam(team)
  }

  if (loading && !organizationId && !projectId) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-sky-500 dark:text-sky-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
          </div>
          {activeTab === 'teams' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToolbarView}
                disabled={!sortedTeams.length}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <ExportListMenu
                columns={TEAM_EXPORT_COLUMNS}
                data={exportRows}
                baseFilename="Teams"
                disabled={!exportRows.length}
              />
              <button
                type="button"
                onClick={() => navigate(createPath)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
                Create Team
              </button>
            </div>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Manage organization teams, resources, and capacity planning
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-x-8 gap-y-1">
          {[
            { id: 'teams', label: 'All Teams', icon: Users },
            { id: 'directory', label: 'Resource Directory', icon: UserSearch },
            { id: 'skills', label: 'Skill Matrix', icon: BarChart3 },
            { id: 'capacity', label: 'Capacity Planning', icon: Calendar },
            { id: 'leaves', label: 'Leave Calendar', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Search + ViewToggle */}
      {(activeTab === 'teams' || activeTab === 'directory') && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder={activeTab === 'teams' ? 'Search teams...' : 'Search resources...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>
          {activeTab === 'teams' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
              <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Teams list layout" />
            </div>
          )}
        </div>
      )}

      {/* Teams content */}
      {activeTab === 'teams' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading teams...</p>
            </div>
          ) : sortedTeams.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Teams Found</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchTerm ? 'No teams match your search.' : 'Get started by creating your first team.'}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => navigate(createPath)}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                >
                  Create Team
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTeamId(team.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedTeamId(team.id)
                    }
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-lg border p-6 transition-colors cursor-pointer text-left ${
                    selectedTeamId === team.id
                      ? 'border-sky-500 ring-1 ring-sky-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-sky-400 dark:hover:border-sky-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <RowNumberBadge number={getDisplayRowNumber(index)} />
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                          {team.team_name}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {teamLeadLabel(team) || 'No team lead assigned'}
                        </p>
                      </div>
                    </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {team.team_type && (
                          <span className="px-2 py-1 text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 rounded">
                            {team.team_type}
                          </span>
                        )}
                        <RowActionButton
                          variant="view"
                          label={`View ${team.team_name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openTeam(team)
                          }}
                        />
                        <RowActionButton
                          variant="edit"
                          label={`Edit ${team.team_name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openTeamEdit(team)
                          }}
                        />
                        <RowActionButton
                          variant="delete"
                          label={`Delete ${team.team_name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTeam(team)
                          }}
                        />
                      </div>
                  </div>
                  {team.team_description && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 line-clamp-2">
                      {team.team_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
                    <span>{team.max_team_size ? `Max: ${team.max_team_size}` : 'Unlimited size'}</span>
                    <span className={team.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                      {team.is_active ? 'Active' : 'Inactive'}
                    </span>
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
                        sortDirection={getSortDirectionForColumn('team_code')}
                        onSort={() => handleSort('team_code')}
                      >
                        Code
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('team_name')}
                        onSort={() => handleSort('team_name')}
                      >
                        Team
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('team_type')}
                        onSort={() => handleSort('team_type')}
                      >
                        Type
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('team_lead')}
                        onSort={() => handleSort('team_lead')}
                      >
                        Team Manager/Lead
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('max_team_size')}
                        onSort={() => handleSort('max_team_size')}
                      >
                        Max size
                      </TableHeaderCell>
                      <TableHeaderCell
                        sortable
                        sortDirection={getSortDirectionForColumn('status')}
                        onSort={() => handleSort('status')}
                      >
                        Status
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => (
                      <TableRow
                        key={team.id}
                        className={`cursor-pointer group ${
                          selectedTeamId === team.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''
                        }`}
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-200">
                          {team.team_code || '—'}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                          {team.team_name}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200 capitalize">
                          {team.team_type || '—'}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200">
                          {teamLeadLabel(team) || '—'}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-200">
                          {team.max_team_size ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              team.is_active
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }
                          >
                            {team.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="inline-flex items-center justify-end gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RowActionButton
                              variant="view"
                              label={`View ${team.team_name}`}
                              onClick={() => openTeam(team)}
                            />
                            <RowActionButton
                              variant="edit"
                              label={`Edit ${team.team_name}`}
                              onClick={() => openTeamEdit(team)}
                            />
                            <RowActionButton
                              variant="delete"
                              label={`Delete ${team.team_name}`}
                              onClick={() => handleDeleteTeam(team)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'directory' && (
        <div className="space-y-4">
          {directoryView && (
            <RecordPeek
              title={directoryView.full_name || 'Resource'}
              onClose={() => setDirectoryView(null)}
              fields={[
                { label: 'Email', value: directoryView.email },
                { label: 'Phone', value: directoryView.phone_number },
                { label: 'Job title', value: directoryView.job_title },
                { label: 'Department', value: directoryView.department },
              ]}
            />
          )}
          {editingDirectory && (
            <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 flex flex-wrap gap-2 items-end">
              <label className="text-xs text-gray-700 dark:text-gray-200">
                Job title
                <input value={editingDirectory.job_title} onChange={(e) => setEditingDirectory((d) => ({ ...d, job_title: e.target.value }))} className="mt-1 block w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              </label>
              <label className="text-xs text-gray-700 dark:text-gray-200">
                Department
                <input value={editingDirectory.department} onChange={(e) => setEditingDirectory((d) => ({ ...d, department: e.target.value }))} className="mt-1 block w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              </label>
              <label className="text-xs text-gray-700 dark:text-gray-200">
                Phone
                <input value={editingDirectory.phone_number} onChange={(e) => setEditingDirectory((d) => ({ ...d, phone_number: e.target.value }))} className="mt-1 block w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              </label>
              <button type="button" onClick={handleSaveDirectory} className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium min-h-[40px]">Save</button>
              <button type="button" onClick={() => setEditingDirectory(null)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm min-h-[40px]">Cancel</button>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading resources...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <UserSearch className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Resources Found</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm
                  ? 'No resources match your search.'
                  : 'No resources available in your organization.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <TableRowNumberHeader className="!normal-case" />
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredResources.map((resource, index) => (
                      <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {resource.avatar_url ? (
                              <img
                                src={resource.avatar_url}
                                alt=""
                                className="h-10 w-10 rounded-full mr-3"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold mr-3">
                                {resource.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {resource.full_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200">
                          {resource.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200">
                          {resource.job_title || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200">
                          {resource.department || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <RowCrudActions
                            name={resource.full_name || 'resource'}
                            canChange={resource.id === currentUserId}
                            onView={() => {
                              setEditingDirectory(null)
                              setDirectoryView(resource)
                            }}
                            onEdit={() => beginEditDirectory(resource)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'skills' || activeTab === 'capacity' || activeTab === 'leaves') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center max-w-2xl mx-auto">
            <Building2 className="h-20 w-20 text-sky-500 dark:text-sky-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {activeTab === 'skills' && 'Skill Matrix'}
              {activeTab === 'capacity' && 'Capacity Planning'}
              {activeTab === 'leaves' && 'Leave Calendar'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This feature is coming soon. We&apos;re working on implementing comprehensive{' '}
              {activeTab === 'skills'
                ? 'skill matrix'
                : activeTab === 'capacity'
                  ? 'capacity planning'
                  : 'leave management'}{' '}
              functionality.
            </p>
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
