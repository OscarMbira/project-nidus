import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { fetchChangeRequests } from '../../services/changeManagementService';
import ChangeRequestList from '../../components/change/ChangeRequestList';
import ChangeRequestForm from '../../components/change/ChangeRequestForm';
import ExportListMenu from '../../components/ui/ExportListMenu';
import { useViewMode } from '../../hooks/useViewMode';
import { platformDb } from '../../services/supabase/supabaseClient';
import { fetchBatchExportForEntities } from '../../features/local-data-extensions/api/customFieldValuesApi';

const CHANGE_REQUEST_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'change_request_number', label: 'Reference' },
  { key: 'status', label: 'Status' }
];

export default function ChangeRequests() {
  const navigate = useNavigate();
  const [changeRequestViewMode, setChangeRequestViewMode] = useViewMode('change-requests', 'grid');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: '',
  });
  const [crCfCols, setCrCfCols] = useState([]);
  const [crCfMatrix, setCrCfMatrix] = useState({});

  useEffect(() => {
    loadRequests();
  }, [filters]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchChangeRequests(filters);
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading change requests:', error);
      alert('Error loading change requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!requests?.length) {
      setCrCfCols([]);
      setCrCfMatrix({});
      return;
    }
    let cancelled = false;
    const byAccount = new Map();
    for (const r of requests) {
      const aid = r.project?.account_id;
      if (!aid || !r.id || !r.project_id) continue;
      if (!byAccount.has(aid)) byAccount.set(aid, []);
      byAccount.get(aid).push(r.id);
    }
    if (!byAccount.size) {
      setCrCfCols([]);
      setCrCfMatrix({});
      return;
    }
    (async () => {
      const colKeys = new Set();
      const columns = [];
      const matrix = {};
      for (const [accountId, entityIds] of byAccount) {
        const { columns: cols, matrix: mx } = await fetchBatchExportForEntities(platformDb, {
          accountId,
          entityType: 'change_request',
          entityIds,
          screenCode: 'change_request_detail',
        });
        for (const c of cols || []) {
          if (!colKeys.has(c.key)) {
            colKeys.add(c.key);
            columns.push(c);
          }
        }
        Object.assign(matrix, mx || {});
      }
      if (!cancelled) {
        setCrCfCols(columns);
        setCrCfMatrix(matrix);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requests]);

  const crExportColumns = useMemo(() => [...CHANGE_REQUEST_COLUMNS, ...crCfCols], [crCfCols]);
  const crExportRows = useMemo(
    () => requests.map((r) => ({ ...r, ...(crCfMatrix[r.id] || {}) })),
    [requests, crCfMatrix]
  );

  const handleCreate = () => {
    setEditingRequest(null);
    setShowForm(true);
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  const handleView = (request) => {
    navigate(`/change-management/${request.id}`);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingRequest(null);
    loadRequests();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Change Requests
          </h1>
          <div className="flex gap-2">
            <ExportListMenu columns={crExportColumns} data={crExportRows} baseFilename="ChangeRequests" disabled={!requests.length} />
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Change Request
          </button>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and track all change requests
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search change requests..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under-assessment">Under Assessment</option>
            <option value="pending-approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="implemented">Implemented</option>
          </select>
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="scope">Scope</option>
            <option value="schedule">Schedule</option>
            <option value="budget">Budget</option>
            <option value="quality">Quality</option>
            <option value="resource">Resource</option>
            <option value="technical">Technical</option>
          </select>
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Change Request List */}
      <ChangeRequestList
        requests={requests}
        onEdit={handleEdit}
        onSelect={handleView}
        onRefresh={loadRequests}
        onAdd={handleCreate}
        viewMode={changeRequestViewMode}
        onViewModeChange={setChangeRequestViewMode}
      />

      {/* Change Request Form Modal */}
      {showForm && (
        <ChangeRequestForm
          request={editingRequest}
          onSave={handleSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingRequest(null);
          }}
        />
      )}
    </div>
  );
}

