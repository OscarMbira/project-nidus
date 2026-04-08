/**
 * Projects Page
 * Optimised: single-query My Projects, no refetch on My-tab search, abort in-flight loads,
 * faster session bootstrap (getSession), memoised grid/list rows.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { platformDb } from '../services/supabase/supabaseClient';
import { getMyProjects, getAllProjects, deleteProject } from '../services/projectService';
import { platformProjectPath } from '../utils/projectRouteParam';
import ExportListMenu from '../components/ui/ExportListMenu';
import { TableHeaderCell } from '../components/ui/Table';
import { ProjectGridCard, ProjectListRow } from '../components/project/ProjectsListViews';
import { useSortableTable } from '../hooks/useSortableTable';
import { useViewMode } from '../hooks/useViewMode';
import ViewToggle from '../components/ui/ViewToggle';

const PROJECT_COLUMNS = [
  { key: 'project_name', label: 'Project Name' },
  { key: 'project_code', label: 'Code' },
  { key: 'project_description', label: 'Description' },
  { key: 'status_name', label: 'Status' },
  { key: 'planned_start_date', label: 'Planned Start' },
  { key: 'planned_end_date', label: 'Planned End' },
  { key: 'percentage_complete', label: '% Complete' }
];

function ProjectListSkeleton({ viewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <div key={k} className="bg-gray-800 rounded-lg border border-gray-700 p-6 h-48" />
        ))}
      </div>
    );
  }
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-700/50 flex">
        <div className="flex-1" />
        <div className="w-28 shrink-0" />
      </div>
      {[1, 2, 3, 4, 5].map((k) => (
        <div key={k} className="h-14 border-t border-gray-700 bg-gray-800/80 flex">
          <div className="flex-1" />
          <div className="w-28 shrink-0 bg-gray-700/30" />
        </div>
      ))}
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [resolvingSession, setResolvingSession] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeView, setActiveView] = useState('my'); // 'my' or 'all'
  const [viewMode, setViewMode] = useViewMode('platform-projects', 'grid');
  const loadGenRef = useRef(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const {
    handleSort,
    getSortDirectionForColumn,
    sortedData,
    supabaseOrder,
  } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-platform-projects-table-sort',
    serverColumnMap: {
      project_name: 'project_name',
      project_code: 'project_code',
      status: 'status_id',
      progress: 'percentage_complete',
      planned_start: 'planned_start_date',
      planned_end: 'planned_end_date',
      created_at: 'created_at',
    },
  });

  const projectSortAccessors = useMemo(
    () => ({
      project_name: (r) => r.project_name ?? '',
      project_code: (r) => r.project_code ?? '',
      status: (r) => r.project_statuses?.status_name ?? '',
      progress: (r) => r.percentage_complete ?? -1,
      planned_start: (r) => r.planned_start_date ?? '',
      planned_end: (r) => r.planned_end_date ?? '',
      created_at: (r) => r.created_at ?? '',
    }),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadUserAndOrganization = useCallback(async () => {
    try {
      const { data: { session } } = await platformDb.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        setUserId(userRecord.id);

        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (account) {
          setOrganizationId(account.id);
        } else {
          const { data: project } = await platformDb
            .from('projects')
            .select('account_id')
            .eq('owner_user_id', userRecord.id)
            .eq('is_deleted', false)
            .limit(1)
            .single();

          if (project?.account_id) {
            setOrganizationId(project.account_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user and organization:', error);
    } finally {
      setResolvingSession(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadUserAndOrganization();
  }, [loadUserAndOrganization]);

  /** Only "All projects" refetches when search changes; "My projects" filters client-side */
  const serverSearchKey = activeView === 'all' ? debouncedSearchTerm : '';
  const serverSortKey =
    activeView === 'all' ? `${supabaseOrder.column}:${supabaseOrder.ascending ? '1' : '0'}` : '';

  useEffect(() => {
    if (!userId) return;

    if (activeView === 'all' && !organizationId) {
      setProjects([]);
      setListLoading(false);
      return;
    }

    const ac = new AbortController();
    const gen = ++loadGenRef.current;

    (async () => {
      setListLoading(true);
      try {
        let result;
        if (activeView === 'my') {
          result = await getMyProjects(userId, {}, { signal: ac.signal });
        } else {
          result = await getAllProjects(
            organizationId,
            {
              search: serverSearchKey,
              sortColumn: supabaseOrder.column,
              sortAscending: supabaseOrder.ascending,
            },
            { signal: ac.signal }
          );
        }

        if (ac.signal.aborted || gen !== loadGenRef.current) return;
        if (result.aborted) return;

        if (result.success) {
          setProjects(result.data || []);
        }
      } catch (e) {
        if (!ac.signal.aborted) console.error('Error loading projects:', e);
      } finally {
        if (!ac.signal.aborted && gen === loadGenRef.current) {
          setListLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [organizationId, userId, activeView, serverSearchKey, serverSortKey, refreshNonce]);

  /** Client-side filter (My tab: primary; All tab: refines server results, e.g. status name) */
  const filteredProjects = useMemo(() => {
    const q = debouncedSearchTerm.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      const name = project.project_name?.toLowerCase() ?? '';
      const desc = project.project_description?.toLowerCase() ?? '';
      const code = project.project_code?.toLowerCase() ?? '';
      const status = project.project_statuses?.status_name?.toLowerCase() ?? '';
      return (
        name.includes(q) || desc.includes(q) || code.includes(q) || status.includes(q)
      );
    });
  }, [projects, debouncedSearchTerm]);

  /** "All" tab: server-ordered; "My" tab: client sort */
  const displayProjects = useMemo(() => {
    if (activeView === 'all') return filteredProjects;
    return sortedData(filteredProjects, projectSortAccessors);
  }, [activeView, filteredProjects, sortedData, projectSortAccessors]);

  const exportRows = useMemo(
    () =>
      displayProjects.map((p) => ({
        ...p,
        status_name: p.project_statuses?.status_name ?? ''
      })),
    [displayProjects]
  );

  const goToProject = useCallback(
    (project) => {
      const segment = (project?.project_code && String(project.project_code).trim()) || project?.id;
      if (!segment) return;
      navigate(platformProjectPath(segment));
    },
    [navigate]
  );

  const goToEditProject = useCallback(
    (project) => {
      const segment = (project?.project_code && String(project.project_code).trim()) || project?.id;
      if (!segment) return;
      navigate(platformProjectPath(segment, 'edit'));
    },
    [navigate]
  );

  const handleDeleteProject = useCallback(
    async (project) => {
      const name = project?.project_name || 'this project';
      if (
        !window.confirm(
          `Delete "${name}"? The project will be removed from lists (soft delete). You can contact support if this was a mistake.`
        )
      ) {
        return;
      }
      setDeletingId(project.id);
      try {
        const result = await deleteProject(project.id);
        if (result.success) {
          setRefreshNonce((n) => n + 1);
        } else {
          window.alert(result.error || 'Could not delete the project.');
        }
      } catch (e) {
        console.error(e);
        window.alert('Could not delete the project.');
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  if (resolvingSession) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  const showListSkeleton = listLoading && projects.length === 0;
  const showUpdatingHint = listLoading && projects.length > 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Projects</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate('/platform/projects/create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Project
            </button>
          </div>
          <p className="text-gray-400">Manage and view all your projects</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8" aria-label="Project scope">
                <button
                  type="button"
                  onClick={() => setActiveView('my')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeView === 'my'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  My Projects
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeView === 'all'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  All Projects
                </button>
              </nav>
            </div>
            {showUpdatingHint && (
              <span className="text-xs text-purple-300/90 animate-pulse" aria-live="polite">
                Updating list…
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ExportListMenu
              columns={PROJECT_COLUMNS}
              data={exportRows}
              baseFilename="Projects"
              disabled={displayProjects.length === 0}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64 max-w-full"
              />
            </div>

            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Project list layout"
              className="!bg-gray-800 !border-gray-700"
            />
          </div>
        </div>

        {showListSkeleton ? (
          <ProjectListSkeleton viewMode={viewMode} />
        ) : displayProjects.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <FolderKanban className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Projects Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No projects match your search.' : 'Get started by creating your first project.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => navigate('/platform/projects/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${showUpdatingHint ? 'opacity-75 transition-opacity' : ''}`}
          >
            {displayProjects.map((project) => (
              <ProjectGridCard
                key={project.id}
                project={project}
                onSelect={goToProject}
                onEdit={goToEditProject}
                onDelete={handleDeleteProject}
                deletingId={deletingId}
              />
            ))}
          </div>
        ) : (
          <div
            className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${showUpdatingHint ? 'opacity-75 transition-opacity' : ''}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('project_name')}
                      onSort={() => handleSort('project_name')}
                      className="!text-gray-300 !normal-case"
                    >
                      Project
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('project_code')}
                      onSort={() => handleSort('project_code')}
                      className="!text-gray-300 !normal-case whitespace-nowrap"
                    >
                      Code
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('status')}
                      onSort={() => handleSort('status')}
                      className="!text-gray-300 !normal-case"
                    >
                      Status
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('progress')}
                      onSort={() => handleSort('progress')}
                      className="!text-gray-300 !normal-case"
                    >
                      Progress
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('planned_start')}
                      onSort={() => handleSort('planned_start')}
                      className="!text-gray-300 !normal-case"
                    >
                      Dates
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable={false}
                      className="!text-gray-300 !normal-case text-right sticky right-0 bg-gray-700/50 z-[1] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)]"
                      scope="col"
                    >
                      Actions
                    </TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {displayProjects.map((project) => (
                    <ProjectListRow
                      key={project.id}
                      project={project}
                      onSelect={goToProject}
                      onEdit={goToEditProject}
                      onDelete={handleDeleteProject}
                      deletingId={deletingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
