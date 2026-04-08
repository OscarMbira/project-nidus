/**
 * Risk Register View Page
 * Main page for viewing and managing risk register
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { AlertTriangle, Plus, BarChart3, Download, Settings, Grid3x3, Calendar } from 'lucide-react';
import RiskMatrixChart from '../components/risks/RiskMatrixChart';
import TopRisksWidget from '../components/risks/TopRisksWidget';
import RisksByCategoryChart from '../components/risks/RisksByCategoryChart';
import RisksByStatusChart from '../components/risks/RisksByStatusChart';
import RiskExposureChart from '../components/risks/RiskExposureChart';
import RiskAlerts from '../components/risks/RiskAlerts';
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
import ExportListMenu from '../components/ui/ExportListMenu';

const RISK_COLUMNS = [
  { key: 'risk_identifier', label: 'ID' },
  { key: 'risk_title', label: 'Title' },
  { key: 'risk_type', label: 'Type' },
  { key: 'risk_category', label: 'Category' },
  { key: 'status_enum', label: 'Status' },
  { key: 'risk_level', label: 'Level' },
  { key: 'proximity', label: 'Proximity' },
  { key: 'pre_risk_score', label: 'Score' }
];

export default function RiskRegisterView() {
  useOfflineQueue();
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [register, setRegister] = useState(null);
  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEnhancedForm, setShowEnhancedForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'matrix', 'analytics', 'reviews'
  const [showPrintView, setShowPrintView] = useState(false)
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

  useEffect(() => {
    if (projectId) {
      fetchRisks();
    }
  }, [projectId, filters]);

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
    setShowForm(true);
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
    navigate(`/app/projects/${projectId}/risks/${risk.id}`);
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
        <div className="flex items-center gap-2">
          <ExportListMenu columns={RISK_COLUMNS} data={risks} baseFilename="RiskRegister" disabled={!risks?.length} />
          <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              List
            </button>
            <button
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
          </div>
            {register && (
              <RiskExportMenu
                register={register}
                risks={risks}
                onPrint={() => setShowPrintView(true)}
              />
            )}
          <button
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

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Total Risks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_risks || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-blue-600">{summary.active_risks || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">High/Very High</p>
            <p className="text-2xl font-bold text-red-600">{summary.high_risks || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Overdue Responses</p>
            <p className="text-2xl font-bold text-orange-600">{summary.overdue_responses || 0}</p>
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {viewMode === 'list' && <RiskAlerts projectId={projectId} />}

      {/* Top Risks Widget (for list view) */}
      {viewMode === 'list' && topRisks.length > 0 && (
        <TopRisksWidget projectId={projectId} limit={3} showAll={false} />
      )}

      {/* Filters */}
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

      {/* Risk Form Modal */}
      {showEnhancedForm && register && (
        <EnhancedRiskForm
          risk={selectedRisk}
          projectId={projectId}
          riskRegisterId={register.id}
          onSave={handleSaveRisk}
          onCancel={() => {
            setShowEnhancedForm(false);
            setSelectedRisk(null);
          }}
        />
      )}


      {/* Risks List */}
      {viewMode === 'list' && (
        <RisksList
          risks={risks}
          loading={false}
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
        />
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
    </div>
  );
}
