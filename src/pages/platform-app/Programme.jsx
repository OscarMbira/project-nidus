/**
 * Programme Module
 * Programme management and coordination
 * Route: /platform/programme
 * CRUD: list → View/Edit/Delete on cards; Create Programme for new; toast on delete/save.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Plus, Search, GitBranch, Target, Calendar, Eye, Edit2, Trash2 } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getProgrammesForList, deleteProgramme } from '../../services/programmeService';
import ExportListMenu from '../../components/ui/ExportListMenu';

const EXPORT_COLUMNS = [
  { key: 'programme_name', label: 'Name' },
  { key: 'programme_code', label: 'Code' },
  { key: 'programme_type', label: 'Type' },
  { key: 'programme_status', label: 'Status' },
  { key: 'programme_description', label: 'Description' },
];

const SEARCH_DEBOUNCE_MS = 300;

export default function Programme() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [toast, setToast] = useState(location.state?.toast ?? null);
  const [deletingId, setDeletingId] = useState(null);
  const debounceRef = useRef(null);

  // Debounced search: refetch when searchTerm (committed) changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const loadProgrammes = useCallback(async (search) => {
    try {
      const data = await getProgrammesForList({ search: search || undefined });
      setProgrammes(data || []);
    } catch (error) {
      console.error('Error loading programmes:', error);
      setProgrammes([]);
    }
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: {} });
      if (location.state.toast.type === 'success') loadProgrammes(searchTerm);
    }
  }, [location.state?.toast, location.pathname, navigate, searchTerm, loadProgrammes]);

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    setLoading(true);
    loadProgrammes(searchTerm).finally(() => setLoading(false));
  }, [searchTerm, loadProgrammes]);

  // Parallel: load org (for future use) and initial programmes; list does not depend on org
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      (async () => {
        try {
          const { data: { user } } = await platformDb.auth.getUser();
          if (!user) {
            navigate('/auth/login');
            return null;
          }
          if (cancelled) return null;
          const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single();
          if (!userRecord) return null;
          const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).single();
          if (account) return account.id;
          const { data: project } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).limit(1).maybeSingle();
          return project?.account_id ?? null;
        } catch {
          return null;
        }
      })(),
      getProgrammesForList({}).then((data) => ({ list: data })),
    ]).then(([orgId, result]) => {
      if (cancelled) return;
      if (orgId != null) setOrganizationId(orgId);
      if (result?.list) setProgrammes(result.list || []);
    }).catch((err) => {
      if (!cancelled) console.error('Error loading programme data:', err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (e, programme) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${programme.programme_name}"? This action cannot be undone.`)) return;
    try {
      setDeletingId(programme.id);
      await deleteProgramme(programme.id);
      setToast({ type: 'success', message: `Programme "${programme.programme_name}" (${programme.programme_code || programme.id}) has been deleted.` });
      loadProgrammes(searchTerm);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete programme: ' + (err?.message || err) });
    } finally {
      setDeletingId(null);
    }
  };

  const exportData = useMemo(
    () =>
      programmes.map((p) => ({
        programme_name: p.programme_name || '',
        programme_code: p.programme_code || '',
        programme_type: p.programme_type || '',
        programme_status: p.programme_status || '',
        programme_description: p.programme_description || '',
      })),
    [programmes]
  );

  const filteredProgrammes = programmes;

  const stats = useMemo(() => {
    const list = programmes;
    return {
      total: list.length,
      active: list.filter((p) => p.programme_status === 'active').length,
      planning: list.filter((p) => p.programme_status === 'planning').length,
      onHold: list.filter((p) => p.programme_status === 'on-hold').length,
    };
  }, [programmes]);

  if (loading && programmes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading programmes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {toast && (
          <div className={`mb-4 p-3 rounded-lg ${toast.type === 'success' ? 'bg-green-900/30 text-green-200' : 'bg-red-900/30 text-red-200'}`}>
            {toast.message}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-100">Programme</h1>
            </div>
            <div className="flex items-center gap-2">
              <ExportListMenu
                columns={EXPORT_COLUMNS}
                data={exportData}
                baseFilename="Programme-List"
                disabled={filteredProgrammes.length === 0}
              />
              <button
                onClick={() => navigate('/platform/programme/create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Programme
              </button>
            </div>
          </div>
          <p className="text-gray-400">
            Coordinate multiple related projects under a programme
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search programmes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Programmes Display */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading programmes...</p>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Layers className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Programmes Found</h3>
            <p className="text-gray-500 mb-6">
              {searchInput ? 'No programmes match your search.' : 'Get started by creating your first programme.'}
            </p>
            {!searchInput && (
              <button
                onClick={() => navigate('/platform/programme/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Programme
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map(programme => (
              <div
                key={programme.id}
                onClick={() => navigate(`/platform/programme/${programme.id}`)}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-100 mb-1 truncate">{programme.programme_name}</h3>
                    {programme.programme_code && (
                      <p className="text-sm text-gray-400">{programme.programme_code}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {programme.programme_type && (
                      <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded">
                        {programme.programme_type}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/platform/programme/${programme.id}`); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700"
                      title="View"
                      aria-label="View programme"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/platform/programme/${programme.id}/edit`); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-700"
                      title="Edit"
                      aria-label="Edit programme"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, programme)}
                      disabled={deletingId === programme.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-50"
                      title="Delete"
                      aria-label="Delete programme"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {programme.programme_description && (
                  <p className="text-gray-400 mb-4 line-clamp-2 text-sm">{programme.programme_description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className={programme.programme_status === 'active' ? 'text-green-400' : 'text-gray-600'}>
                    {programme.programme_status || 'Unknown'}
                  </span>
                  {programme.programme_owner && (
                    <span className="text-gray-400 truncate ml-2">Owner: {programme.programme_owner.full_name || programme.programme_owner.email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {filteredProgrammes.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="h-6 w-6 text-blue-500" />
                <span className="text-2xl font-bold text-gray-100">{stats.total}</span>
              </div>
              <p className="text-sm text-gray-400">Total Programmes</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <GitBranch className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.active}</span>
              </div>
              <p className="text-sm text-gray-400">Active Programmes</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.planning}</span>
              </div>
              <p className="text-sm text-gray-400">In Planning</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-6 w-6 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.onHold}</span>
              </div>
              <p className="text-sm text-gray-400">On Hold</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
