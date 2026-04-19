/**
 * Portfolio Module
 * Portfolio management and oversight
 * Route: /platform/portfolio
 * CRUD: list → click card (view) → Edit/Delete; Create Portfolio for new.
 * Optimised: parallel org + list load, debounced search, refresh on success toast, memoized stats.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, Plus, Search, BarChart3, TrendingUp, Target, Eye, Edit2, Trash2 } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getPortfolios, deletePortfolio } from '../../services/portfolioService';
import ExportListMenu from '../../components/ui/ExportListMenu';

const EXPORT_COLUMNS = [
  { key: 'portfolio_name', label: 'Name' },
  { key: 'portfolio_code', label: 'Code' },
  { key: 'portfolio_description', label: 'Description' },
  { key: 'portfolio_type', label: 'Type' },
  { key: 'portfolio_status', label: 'Status' },
];
const SEARCH_DEBOUNCE_MS = 300;

export default function Portfolio() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [toast, setToast] = useState(location.state?.toast ?? null);
  const [deletingId, setDeletingId] = useState(null);
  const debounceRef = useRef(null);

  const loadPortfolios = useCallback(async (search) => {
    try {
      const data = await getPortfolios({ search: search || undefined });
      return data || [];
    } catch (error) {
      console.error('Error loading portfolios:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: {} });
      if (location.state.toast.type === 'success') {
        loadPortfolios(searchTerm).then(setPortfolios);
      }
    }
  }, [location.state?.toast, location.pathname, navigate, searchTerm, loadPortfolios]);

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

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    setLoading(true);
    loadPortfolios(searchTerm).then(setPortfolios).finally(() => setLoading(false));
  }, [searchTerm, loadPortfolios]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loadOrg = async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (!user) {
          navigate('/auth/login');
          return null;
        }
        const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).single();
        if (!userRecord) return null;
        const { data: account } = await platformDb.from('accounts').select('id').eq('owner_user_id', userRecord.id).single();
        if (account) return account.id;
        const { data: project } = await platformDb.from('projects').select('account_id').eq('owner_user_id', userRecord.id).eq('is_deleted', false).limit(1).maybeSingle();
        return project?.account_id ?? null;
      } catch (e) {
        console.error('Error loading organization:', e);
        return null;
      }
    };
    Promise.all([loadOrg(), loadPortfolios('')]).then(([orgId, list]) => {
      if (cancelled) return;
      if (orgId != null) setOrganizationId(orgId);
      setPortfolios(list);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadPortfolios, navigate]);

  const handleDelete = async (e, portfolio) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${portfolio.portfolio_name}"? This action cannot be undone.`)) return;
    try {
      setDeletingId(portfolio.id);
      await deletePortfolio(portfolio.id);
      setToast({ type: 'success', message: `Portfolio "${portfolio.portfolio_name}" (ID: ${portfolio.id}) has been deleted.` });
      loadPortfolios(searchTerm).then(setPortfolios);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete portfolio: ' + (err?.message || err) });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPortfolios = portfolios;

  const stats = useMemo(() => ({
    total: filteredPortfolios.length,
    active: filteredPortfolios.filter(p => p.portfolio_status === 'active').length,
    planning: filteredPortfolios.filter(p => p.portfolio_status === 'planning').length,
    onHold: filteredPortfolios.filter(p => p.portfolio_status === 'on-hold').length,
  }), [filteredPortfolios]);

  const exportData = useMemo(
    () =>
      filteredPortfolios.map((p) => ({
        portfolio_name: p.portfolio_name || '',
        portfolio_code: p.portfolio_code || '',
        portfolio_description: p.portfolio_description || '',
        portfolio_type: p.portfolio_type || '',
        portfolio_status: p.portfolio_status || '',
      })),
    [filteredPortfolios]
  );

  if (loading && portfolios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && (
          <div className={`mb-4 p-3 rounded-lg ${toast.type === 'success' ? 'bg-green-900/30 text-green-200' : 'bg-red-900/30 text-red-200'}`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-100">Portfolio</h1>
            </div>
            <div className="flex items-center gap-2">
              <ExportListMenu
                columns={EXPORT_COLUMNS}
                data={exportData}
                baseFilename="Portfolio-List"
                disabled={filteredPortfolios.length === 0}
              />
              <button
                onClick={() => navigate('/platform/portfolio/create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Portfolio
              </button>
            </div>
          </div>
          <p className="text-gray-400">
            Portfolio-level project oversight and strategic alignment
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search portfolios..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search portfolios"
            />
          </div>
        </div>

        {/* Portfolios Display */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading portfolios...</p>
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Portfolios Found</h3>
            <p className="text-gray-500 mb-6">
              {searchInput ? 'No portfolios match your search.' : 'Get started by creating your first portfolio.'}
            </p>
            {!searchInput && (
              <button
                onClick={() => navigate('/platform/portfolio/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Portfolio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map(portfolio => (
              <div
                key={portfolio.id}
                onClick={() => navigate(`/platform/portfolio/edit/${portfolio.id}`, { state: { viewOnly: true } })}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-100 mb-1 truncate">{portfolio.portfolio_name}</h3>
                    {portfolio.portfolio_code && (
                      <p className="text-sm text-gray-400">{portfolio.portfolio_code}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {portfolio.portfolio_type && (
                      <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded">
                        {portfolio.portfolio_type}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/platform/portfolio/edit/${portfolio.id}`, { state: { viewOnly: true } }); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700"
                      title="View"
                      aria-label="View portfolio"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/platform/portfolio/edit/${portfolio.id}`, { state: { viewOnly: false } }); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-700"
                      title="Edit"
                      aria-label="Edit portfolio"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, portfolio)}
                      disabled={deletingId === portfolio.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-50"
                      title="Delete"
                      aria-label="Delete portfolio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {portfolio.portfolio_description && (
                  <p className="text-gray-400 mb-4 line-clamp-2 text-sm">{portfolio.portfolio_description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className={portfolio.portfolio_status === 'active' ? 'text-green-400' : 'text-gray-600'}>
                    {portfolio.portfolio_status || 'Unknown'}
                  </span>
                  {portfolio.portfolio_owner && (
                    <span className="text-gray-400 truncate ml-2">Owner: {portfolio.portfolio_owner.full_name || portfolio.portfolio_owner.email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {filteredPortfolios.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-6 w-6 text-blue-500" />
                <span className="text-2xl font-bold text-gray-100">{stats.total}</span>
              </div>
              <p className="text-sm text-gray-400">Total Portfolios</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.active}</span>
              </div>
              <p className="text-sm text-gray-400">Active Portfolios</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.planning}</span>
              </div>
              <p className="text-sm text-gray-400">In Planning</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-6 w-6 text-yellow-400" />
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
