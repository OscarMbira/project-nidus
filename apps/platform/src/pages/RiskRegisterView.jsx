/**
 * Risk Register View Page
 * Main page for viewing and managing risk register
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { useOfflineQueue } from '@nidus/shared/hooks/useOfflineQueue';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { AlertTriangle, Plus, BarChart3, Settings, Grid3x3, Calendar, LayoutDashboard, List } from 'lucide-react';
import RiskMatrixChart from '../components/risks/RiskMatrixChart';
import TopRisksWidget from '../components/risks/TopRisksWidget';
import RisksByCategoryChart from '../components/risks/RisksByCategoryChart';
import RisksByStatusChart from '../components/risks/RisksByStatusChart';
import RiskExposureChart from '../components/risks/RiskExposureChart';
import RiskAlerts from '../components/risks/RiskAlerts';
import { RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui';
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery';

// Statuses that count as "active" per get_risk_summary() (v172): everything except closed/expired.
const RISK_ACTIVE_STATUSES = ['identified', 'assessing', 'responding', 'monitoring', 'occurred'];
const RISK_EMPTY_FILTERS = { search: '', risk_category: '', risk_type: '', status: '', risk_level: '', proximity: '' };
import { getRiskRegisterByProject, updateRiskRegister } from '../services/riskRegisterService';
import { getRisksByProject, createRisk, updateRisk, deleteRisk, closeRisk, getRiskSummary, getTopRisks } from '../services/riskService';
import { escalateRiskToIssue } from '../services/riskService';
import RisksList from '../components/risks/RisksList';
import RisksFilters from '../components/risks/RisksFilters';
import RiskCard from '../components/risks/RiskCard';
import EnhancedRiskForm from '../components/risks/EnhancedRiskForm';
import RiskExportMenu from '../components/risks/RiskExportMenu';
import RiskReviewHistory from '../components/risks/RiskReviewHistory';
import RiskPrintView from '../components/risks/RiskPrintView';
import TierFieldCustomisationPanel from '@nidus/ui/TierFieldCustomisationPanel.jsx';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';
import { RISK_REGISTER_CATEGORY } from '../features/local-data-extensions/components/InheritedRiskRegisterFields';
import { platformDb } from '@nidus/supabase';
import { fetchBatchExportForEntities } from '../features/local-data-extensions/api/customFieldValuesApi';
import { platformRiskPath } from '@nidus/shared/utils/projectRouteParam';

const RISK_COLUMNS = [
  { key: 'risk_identifier', label: 'ID' },
  { key: 'risk_title', label: 'Title' },
  { key: 'risk_type', label: 'Type' },
  { key: 'risk_category', label: 'Category' },
  { key: 'status_enum', label: 'Status' },
  { key: 'risk_level', label: 'Level' },
  { key: 'pre_risk_score', label: 'Score' },
  { key: 'proximity', label: 'Proximity' },
  { key: 'response_category', label: 'Risk Response' },
  { key: 'pre_impact', label: 'Impact' }
];

export default function RiskRegisterView() {
  useOfflineQueue();
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [register, setRegister] = useState(null);
  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEnhancedForm, setShowEnhancedForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  // 'dashboard' = summary/alerts/top risks; 'register' = filters + list/table
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'register' | 'matrix' | 'analytics' | 'reviews' | 'settings'
  const [riskListLayout, setRiskListLayout] = useViewMode('pm-risk-register', 'list')
  const [showPrintView, setShowPrintView] = useState(false)
  const [riskOrgAccountId, setRiskOrgAccountId] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [riskCfCols, setRiskCfCols] = useState([]);
  const [riskCfMatrix, setRiskCfMatrix] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    risk_category: '',
    risk_type: '',
    status: '',
    risk_level: '',
    proximity: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const initialQueryFilter = useInitialFilterFromQuery(['filter']);
  useEffect(() => {
    if (initialQueryFilter.filter === 'open') {
      setFilters({ ...RISK_EMPTY_FILTERS, status_in: RISK_ACTIVE_STATUSES });
      setViewMode('register');
    } else if (initialQueryFilter.filter === 'high') {
      setFilters({ ...RISK_EMPTY_FILTERS, risk_level_in: ['high', 'very_high'] });
      setViewMode('register');
    } else if (initialQueryFilter.filter === 'overdue') {
      setFilters({ ...RISK_EMPTY_FILTERS, overdue_responses_only: true });
      setViewMode('register');
    } else if (initialQueryFilter.filter === 'all') {
      setFilters(RISK_EMPTY_FILTERS);
      setViewMode('register');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryFilter.filter]);

  useEffect(() => {
    if (projectId) {
      fetchRisks();
    }
  }, [projectId, filters]);

  useEffect(() => {
    if (!projectId) {
      setRiskOrgAccountId(null);
      setProjectName(null);
      return;
    }
    let cancelled = false;
    platformDb
      .from('projects')
      .select('account_id, project_name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setRiskOrgAccountId(data?.account_id || null);
          setProjectName(data?.project_name || null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!riskOrgAccountId || !risks?.length) {
      setRiskCfCols([]);
      setRiskCfMatrix({});
      return;
    }
    let cancelled = false;
    const ids = risks.map((r) => r.id).filter(Boolean);
    (async () => {
      const { columns, matrix } = await fetchBatchExportForEntities(platformDb, {
        accountId: riskOrgAccountId,
        entityType: 'risk',
        entityIds: ids,
        screenCode: 'risk_detail',
      });
      if (!cancelled) {
        setRiskCfCols(columns || []);
        setRiskCfMatrix(matrix || {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riskOrgAccountId, risks]);

  const riskExportColumns = useMemo(() => [...RISK_COLUMNS, ...riskCfCols], [riskCfCols]);
  const riskExportRows = useMemo(
    () => risks.map((r) => ({ ...r, ...(riskCfMatrix[r.id] || {}) })),
    [risks, riskCfMatrix]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      let registerResult = await getRiskRegisterByProject(projectId);
      
      // Auto-create register if it doesn't exist
      if (registerResult.success && !registerResult.data) {
        const { createRiskRegister } = await import('../services/riskRegisterService');
        const createResult = await createRiskRegister(projectId);
        if (createResult.success) {
          registerResult = await getRiskRegisterByProject(projectId);
        }
      }

      const [summaryResult, topRisksResult] = await Promise.all([
        getRiskSummary(projectId),
        getTopRisks(projectId, 5)
      ]);

      if (registerResult.success) {
        setRegister(registerResult.data);
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      if (topRisksResult.success) {
        setTopRisks(topRisksResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching risk register data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRisks = async () => {
    try {
      const result = await getRisksByProject(projectId, filters);
      if (result.success) {
        setRisks(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
    }
  };

  const handleSaveRisk = async () => {
    // Refresh data after save
    await fetchRisks();
    await fetchData();
    setShowForm(false);
    setShowEnhancedForm(false);
    setSelectedRisk(null);
  };

  const handleSaveRiskOld = async (riskData) => {
    try {
      let result;
      if (selectedRisk) {
        result = await updateRisk(selectedRisk.id, riskData);
      } else {
        result = await createRisk({
          ...riskData,
          project_id: projectId
        });
      }

      if (result.success) {
        setShowForm(false);
        setSelectedRisk(null);
        fetchRisks();
        fetchData();
      } else {
        alert('Error saving risk: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving risk:', error);
      alert('Error saving risk: ' + error.message);
    }
  };

  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    setShowEnhancedForm(true);
  };

  const handleDelete = async (risk) => {
    if (!confirm(`Delete risk "${risk.risk_title}"?`)) return;

    try {
      const result = await deleteRisk(risk.id);
      if (result.success) {
        fetchRisks();
        fetchData();
      } else {
        alert('Error deleting risk: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting risk:', error);
      alert('Error deleting risk: ' + error.message);
    }
  };

  const handleViewDetails = (risk) => {
    const pk = routeKey || projectId;
    const riskKey =
      (risk.risk_identifier && String(risk.risk_identifier).trim()) ||
      (risk.risk_code && String(risk.risk_code).trim()) ||
      risk.id;
    navigate(platformRiskPath(pk, riskKey));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show print view if requested
  if (showPrintView && register) {
    return (
      <RiskPrintView
        register={register}
        risks={risks}
        onBack={() => setShowPrintView(false)}
      />
    )
  }

  const handleCancelEnhancedForm = () => {
    setShowEnhancedForm(false);
    setSelectedRisk(null);
  };

  // Full-page create/edit — replaces the register list (never a modal overlay).
  if (showEnhancedForm) {
    const listHref = `${location.pathname}${location.search || ''}`;
    return (
      <div className="w-full space-y-4">
        <Link
          to={listHref}
          replace
          onClick={(e) => {
            e.preventDefault();
            handleCancelEnhancedForm();
          }}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to risk list
        </Link>
        <EnhancedRiskForm
          variant="page"
          risk={selectedRisk}
          projectId={projectId}
          riskRegisterId={register?.id}
          onSave={handleSaveRisk}
          onCancel={handleCancelEnhancedForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Risk Register
          </h1>
          {register && (
            <p className="text-sm text-gray-500 mt-1">
              Reference: {register.register_reference} • Version: {register.version_number || '1.0'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'register' && (
            <ViewToggle value={riskListLayout} onChange={setRiskListLayout} ariaLabel="Risk list layout" />
          )}
          <div className="flex flex-wrap items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 inline mr-1" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'register'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-4 w-4 inline mr-1" />
              Register
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Grid3x3 className="h-4 w-4 inline mr-1" />
              Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-1" />
              Analytics
            </button>
            {register && (
              <button
                type="button"
                onClick={() => setViewMode('reviews')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'reviews'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-1" />
                Reviews
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('settings')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-1" />
              Settings
            </button>
          </div>
          {register && (
            <RiskExportMenu
              register={register}
              risks={risks}
              columns={riskExportColumns}
              data={riskExportRows}
              baseFilename="RiskRegister"
              onPrint={() => setShowPrintView(true)}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedRisk(null);
              setShowEnhancedForm(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Risk
          </button>
        </div>
      </div>

      {/* Risk Dashboard — summary, alerts, top risks */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardStatCard
                label="Total Risks"
                value={summary.total_risks || 0}
                onClick={() => { setFilters(RISK_EMPTY_FILTERS); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Active"
                value={summary.active_risks || 0}
                accentClassName="text-blue-600 dark:text-blue-400"
                onClick={() => { setFilters({ ...RISK_EMPTY_FILTERS, status_in: RISK_ACTIVE_STATUSES }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="High/Very High"
                value={summary.high_risks || 0}
                accentClassName="text-red-600 dark:text-red-400"
                onClick={() => { setFilters({ ...RISK_EMPTY_FILTERS, risk_level_in: ['high', 'very_high'] }); setViewMode('register'); }}
              />
              <DashboardStatCard
                label="Overdue Responses"
                value={summary.overdue_responses || 0}
                accentClassName="text-orange-600 dark:text-orange-400"
                onClick={() => { setFilters({ ...RISK_EMPTY_FILTERS, overdue_responses_only: true }); setViewMode('register'); }}
              />
            </div>
          )}
          <RiskAlerts projectId={projectId} />
          <RegisterOpenItemsWidget
            title="Top Risks"
            icon={AlertTriangle}
            rows={topRisks}
            columns={[
              { key: 'risk_identifier', label: 'Reference', className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
              { key: 'title', label: 'Title', className: 'font-medium text-gray-900 dark:text-white' },
              {
                key: 'risk_score',
                label: 'Risk Score',
                render: (r) => (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {r.risk_score || '—'}
                  </span>
                ),
              },
              {
                key: 'expected_value',
                label: 'Expected Value',
                sortAccessor: (r) => Number(r.expected_value) || 0,
                render: (r) => (r.expected_value != null ? Number(r.expected_value).toLocaleString() : '—'),
                className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap',
              },
            ]}
            rowKey={(r) => r.risk_id}
            searchFields={['risk_identifier', 'title']}
            onRowClick={(r) => handleViewDetails({ risk_identifier: r.risk_identifier, id: r.risk_id })}
            onViewAll={() => setViewMode('register')}
            viewAllLabel="Open full Risk Register"
            emptyMessage="No open risks"
          />
        </div>
      )}

      {/* Risk Register — filters + list/table */}
      {viewMode === 'register' && (
        <div className="space-y-6">
          <RisksFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={() => setFilters({
              search: '',
              risk_category: '',
              risk_type: '',
              status: '',
              risk_level: '',
              proximity: ''
            })}
          />
          <RisksList
            risks={risks}
            loading={false}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEscalate={async (risk) => {
              const result = await escalateRiskToIssue(risk.id);
              if (result.success) {
                alert('Risk escalated to issue successfully!');
                fetchRisks();
              }
            }}
            emptyMessage="No risks found. Click 'Add Risk' to get started."
            viewMode={riskListLayout}
          />
        </div>
      )}

      {/* Risk Matrix View */}
      {viewMode === 'matrix' && register && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskMatrixChart
            projectId={projectId}
            registerId={register.id}
            prePostMode="pre"
          />
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopRisksWidget projectId={projectId} limit={5} showAll={true} />
            <RiskExposureChart projectId={projectId} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RisksByCategoryChart projectId={projectId} chartType="bar" />
            <RisksByStatusChart projectId={projectId} />
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {viewMode === 'reviews' && register && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskReviewHistory registerId={register.id} projectId={projectId} />
        </div>
      )}

      {/* Field template settings (v785) */}
      {viewMode === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Risk Register field templates
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Inherit fields from PMO / portfolio / programme defaults for this register, then disable or add local fields
            for this project. Mandatory lock prevents lower tiers from turning a field off.
          </p>
          {riskOrgAccountId && projectId ? (
            <TierFieldCustomisationPanel
              db={platformDb}
              accountId={riskOrgAccountId}
              tier="project"
              entityType="project"
              entityId={projectId}
              entityName={projectName || 'Project'}
              category={RISK_REGISTER_CATEGORY}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          )}
        </div>
      )}
    </div>
  );
}
