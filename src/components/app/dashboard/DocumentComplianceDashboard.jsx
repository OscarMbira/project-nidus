/**
 * Document Compliance Dashboard Component
 * 
 * Shows overall compliance metrics:
 * - Overall compliance percentage
 * - Missing mandatory documents (RED alert)
 * - Pending approvals (AMBER warning)
 * - Overdue documents
 * - Compliance breakdown by stage
 * - Storage usage per project
 */

import { useState, useEffect, memo } from 'react';
import { 
  AlertCircle, Clock, CheckCircle2, FileText, 
  TrendingUp, TrendingDown, HardDrive
} from 'lucide-react';
import { 
  getProjectComplianceSummary,
  getOverdueApprovals,
  getProjectStorageSummary
} from '../../../services/documentGovernanceService';
import { formatFileSize } from '../../../services/documentStorageService';
import toast from 'react-hot-toast';

const DocumentComplianceDashboard = memo(function DocumentComplianceDashboard({
  organizationId,
  projectId = null // If null, shows organization-wide stats
}) {
  const [compliance, setCompliance] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId, projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [complianceData, overdueData, storageData] = await Promise.all([
        getProjectComplianceSummary(projectId),
        getOverdueApprovals(50),
        getProjectStorageSummary(projectId)
      ]);

      setCompliance(Array.isArray(complianceData) ? complianceData[0] : complianceData);
      setOverdue(overdueData || []);
      setStorage(Array.isArray(storageData) ? storageData[0] : storageData);
    } catch (err) {
      console.error('Error loading compliance data:', err);
      setError(err.message || 'Failed to load compliance data');
      toast.error('Failed to load compliance dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading compliance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Error</h3>
        </div>
        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const compliancePercentage = compliance?.compliance_percentage || 0;
  const missingMandatory = compliance?.missing_mandatory_count || 0;
  const pendingApprovals = compliance?.pending_approval_count || 0;
  const overdueCount = overdue.length;
  const totalDocuments = compliance?.total_documents || 0;
  const approvedDocuments = compliance?.approved_documents_count || 0;

  const getComplianceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getComplianceBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className="space-y-6">
      {/* Overall Compliance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Overall Compliance
        </h3>
        <div className="flex items-center gap-6">
          <div className={`flex-shrink-0 w-32 h-32 rounded-full flex items-center justify-center ${getComplianceBgColor(compliancePercentage)}`}>
            <span className={`text-4xl font-bold ${getComplianceColor(compliancePercentage)}`}>
              {compliancePercentage.toFixed(0)}%
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalDocuments}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{approvedDocuments}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Missing Required</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{missingMandatory}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{pendingApprovals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Missing Mandatory Documents */}
        <div className={`rounded-lg border p-4 ${missingMandatory > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
          <div className="flex items-center gap-3 mb-2">
            {missingMandatory > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white">Missing Required</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{missingMandatory}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {missingMandatory > 0 ? 'Mandatory documents missing' : 'All required documents present'}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className={`rounded-lg border p-4 ${pendingApprovals > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Pending Approval</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingApprovals}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Documents awaiting approval
          </p>
        </div>

        {/* Overdue Documents */}
        <div className={`rounded-lg border p-4 ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
          <div className="flex items-center gap-3 mb-2">
            {overdueCount > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white">Overdue</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{overdueCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {overdueCount > 0 ? 'Documents past due date' : 'No overdue documents'}
          </p>
        </div>
      </div>

      {/* Storage Usage */}
      {storage && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Usage</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Used</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatFileSize(storage.total_bytes || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(((storage.total_bytes || 0) / (500 * 1024 * 1024)) * 100, 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Limit: {formatFileSize(500 * 1024 * 1024)} per project
            </p>
          </div>
        </div>
      )}

      {/* Overdue Documents List */}
      {overdueCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Overdue Documents
          </h3>
          <div className="space-y-2">
            {overdue.slice(0, 10).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {doc.document_name || doc.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {doc.project_name} • Due: {new Date(doc.due_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {Math.ceil((new Date() - new Date(doc.due_date)) / (1000 * 60 * 60 * 24))} days overdue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DocumentComplianceDashboard;
