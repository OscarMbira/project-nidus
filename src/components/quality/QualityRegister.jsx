import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Edit2, Trash2, Eye, FileText, Activity, RefreshCw } from 'lucide-react';
import { deleteQualityRegisterItem, getQualityActivities } from '../../services/qualityManagementService';
import QualityActivityExportMenu from './QualityActivityExportMenu';
import ExportListMenu from '../ui/ExportListMenu';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../ui/Table';
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils';
import { useSortableTable } from '../../hooks/useSortableTable';

const QUALITY_REGISTER_COLUMNS = [
  { key: 'product_name', label: 'Product Name' },
  { key: 'product_description', label: 'Description' },
  { key: 'status', label: 'Status' }
];
const QUALITY_ACTIVITY_COLUMNS = [
  { key: 'activity_identifier', label: 'Identifier' },
  { key: 'product_title', label: 'Product' },
  { key: 'activity_type', label: 'Type' },
  { key: 'result', label: 'Result' },
  { key: 'activity_date', label: 'Date' }
];

export default function QualityRegister({ items = [], onEdit, onView, onRefresh, projectId, registerViewMode = 'list' }) {
  const [deleting, setDeleting] = useState(null);
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'product_name', direction: 'asc' },
    storageKey: 'nidus-quality-register-sort',
  });
  const registerAccessors = useMemo(
    () => ({
      product_name: (r) => r.product_name ?? '',
      product_type: (r) => r.product_type ?? '',
      quality_method: (r) => r.quality_method ?? '',
      quality_status: (r) => r.quality_status ?? '',
      quality_score: (r) => r.quality_score ?? -1,
      review_date: (r) => r.quality_review_actual_date || r.quality_review_planned_date || '',
    }),
    []
  );
  const displayRegisterItems = useMemo(
    () => sortedData(items, registerAccessors),
    [items, sortedData, registerAccessors]
  );
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'activities'
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityFilters, setActivityFilters] = useState({
    activity_type: '',
    quality_method: '',
    result: '',
    is_reassessment: '',
    search: ''
  });

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.product_name}" from the quality register?`)) {
      return;
    }

    try {
      setDeleting(item.id);
      await deleteQualityRegisterItem(item.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting quality register item:', error);
      alert('Error deleting item: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'in-review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'in-review':
        return <Clock className="h-4 w-4" />;
      case 'conditional':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const fetchActivities = async () => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    try {
      setLoadingActivities(true);
      const result = await getQualityActivities(projectId, activityFilters);
      if (result.success) {
        setActivities(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Fetch activities when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'activities' && projectId) {
      fetchActivities();
    }
  }, [activeTab, activityFilters, projectId]);

  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'passed-with-conditions':
      case 'passed_with_conditions':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'deferred':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (activeTab === 'activities' && items.length === 0 && activities.length === 0 && !loadingActivities) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'register'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="inline h-4 w-4 mr-2" />
              Quality Register
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Activity className="inline h-4 w-4 mr-2" />
              Quality Activities
            </button>
          </div>
        </div>
        <div className="p-12 text-center">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Activities
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Quality activities will appear here once reviews or inspections are created
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === 'register' && items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'register'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="inline h-4 w-4 mr-2" />
              Quality Register
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Activity className="inline h-4 w-4 mr-2" />
              Quality Activities
            </button>
          </div>
        </div>
        <div className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Register Items
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Add products and deliverables to track quality
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'register'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Quality Register
          </button>
          <button
            onClick={() => {
              setActiveTab('activities');
              if (projectId) {
                fetchActivities();
              }
            }}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'activities'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Activity className="inline h-4 w-4 mr-2" />
            Quality Activities
          </button>
          </div>
          <div className="px-4 py-2">
            <ExportListMenu
              columns={activeTab === 'register' ? QUALITY_REGISTER_COLUMNS : QUALITY_ACTIVITY_COLUMNS}
              data={activeTab === 'register' ? items : activities}
              baseFilename={activeTab === 'register' ? 'QualityRegister' : 'QualityActivities'}
              disabled={activeTab === 'register' ? !items.length : !activities.length}
            />
          </div>
        </div>
      </div>

      {/* Activities Tab Content */}
      {activeTab === 'activities' && (
        <div className="p-4">
          {/* Activity Filters and Export */}
          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <select
                value={activityFilters.activity_type || ''}
                onChange={(e) => {
                  setActivityFilters({ ...activityFilters, activity_type: e.target.value });
                  fetchActivities();
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="review">Reviews</option>
                <option value="inspection">Inspections</option>
              </select>
              <select
                value={activityFilters.result || ''}
                onChange={(e) => {
                  setActivityFilters({ ...activityFilters, result: e.target.value });
                  fetchActivities();
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Results</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="passed_with_conditions">Passed with Conditions</option>
                <option value="deferred">Deferred</option>
              </select>
              <button
                onClick={fetchActivities}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
            {activities.length > 0 && (
              <QualityActivityExportMenu
                activities={activities}
                project={{ project_id: projectId }}
              />
            )}
          </div>

          {/* Activities Table */}
          {loadingActivities ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No activities found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Activity ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Forecast</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activities.map((activity) => (
                    <tr key={`${activity.activity_type}-${activity.activity_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-900 dark:text-white">
                            {activity.activity_identifier || 'N/A'}
                          </span>
                          {activity.is_reassessment && (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                              Reassessment
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">{activity.product_title || 'N/A'}</div>
                        {activity.product_identifier && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{activity.product_identifier}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {activity.quality_method || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activity.result ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultColor(activity.result)}`}>
                            {activity.result.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {activity.planned_date ? new Date(activity.planned_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {activity.forecast_date ? new Date(activity.forecast_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {activity.actual_date ? new Date(activity.actual_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {activity.activity_identifier && (
                          <button
                            onClick={() => {
                              if (typeof onView === 'function') {
                                onView(activity);
                              } else {
                                window.location.href = `/platform/quality/activity/${activity.activity_identifier}`;
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                            title="View Activity"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Register Tab Content */}
      {activeTab === 'register' && registerViewMode === 'grid' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRegisterItems.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px] flex flex-col bg-white dark:bg-gray-800"
            >
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{item.product_name}</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs capitalize px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {item.product_type || '—'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(item.quality_status)}`}>
                  {getStatusIcon(item.quality_status)}
                  {item.quality_status?.replace('-', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-auto pt-2">
                {item.quality_review_actual_date
                  ? `Reviewed ${new Date(item.quality_review_actual_date).toLocaleDateString()}`
                  : item.quality_review_planned_date
                  ? `Planned ${new Date(item.quality_review_planned_date).toLocaleDateString()}`
                  : 'No review date'}
              </p>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {onView && (
                  <button type="button" onClick={() => onView(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" aria-label="View">
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {onEdit && (
                  <button type="button" onClick={() => onEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" aria-label="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deleting === item.id}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'register' && registerViewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <TableRowNumberHeader className="!normal-case" />
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('product_name')}
                onSort={() => handleSort('product_name')}
                className="!normal-case"
              >
                Product/Deliverable
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('product_type')}
                onSort={() => handleSort('product_type')}
                className="!normal-case"
              >
                Type
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('quality_method')}
                onSort={() => handleSort('quality_method')}
                className="!normal-case"
              >
                Quality Method
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('quality_status')}
                onSort={() => handleSort('quality_status')}
                className="!normal-case"
              >
                Status
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('quality_score')}
                onSort={() => handleSort('quality_score')}
                className="!normal-case"
              >
                Quality Score
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirectionForColumn('review_date')}
                onSort={() => handleSort('review_date')}
                className="!normal-case"
              >
                Review Date
              </TableHeaderCell>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayRegisterItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.product_name}
                    </div>
                    {item.product_reference && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.product_reference}
                      </div>
                    )}
                    {item.project && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.project.project_name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {item.product_type || 'N/A'}
                  </span>
                  {item.product_category && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.product_category}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {item.quality_method?.replace('-', ' ') || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(item.quality_status)}`}>
                    {getStatusIcon(item.quality_status)}
                    {item.quality_status?.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.quality_score !== null ? (
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${
                        item.quality_score >= 90 ? 'text-green-600 dark:text-green-400' :
                        item.quality_score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(item.quality_score)}%
                      </div>
                      {item.quality_issues_found > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({item.quality_issues_found} issues)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not scored</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.quality_review_actual_date ? (
                    new Date(item.quality_review_actual_date).toLocaleDateString()
                  ) : item.quality_review_planned_date ? (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {new Date(item.quality_review_planned_date).toLocaleDateString()}
                    </span>
                  ) : (
                    'Not scheduled'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deleting === item.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

