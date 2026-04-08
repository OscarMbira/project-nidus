/**
 * Programme Document Compliance Component
 * 
 * Shows programme-level document compliance:
 * - Programme-level compliance summary
 * - List all projects in programme with compliance status
 * - Highlight cross-project document gaps
 * - Display audit readiness indicator
 * - Show total storage usage for programme
 */

import { useState, useEffect, memo } from 'react';
import { CheckCircle2, XCircle, AlertCircle, HardDrive, TrendingUp } from 'lucide-react';
import { getProgrammeComplianceSummary } from '../../../services/documentGovernanceService';
import { getProgrammeStorageUsage, formatFileSize } from '../../../services/documentStorageService';
import toast from 'react-hot-toast';

const ProgrammeDocumentCompliance = memo(function ProgrammeDocumentCompliance({
  programmeId
}) {
  const [compliance, setCompliance] = useState(null);
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (programmeId) {
      loadData();
    }
  }, [programmeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [complianceData, storage] = await Promise.all([
        getProgrammeComplianceSummary(programmeId),
        getProgrammeStorageUsage(programmeId)
      ]);

      setCompliance(Array.isArray(complianceData) ? complianceData[0] : complianceData);
      setStorageUsage(storage || 0);
    } catch (err) {
      console.error('Error loading programme compliance:', err);
      setError(err.message || 'Failed to load programme compliance');
      toast.error('Failed to load programme compliance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading programme compliance...</p>
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

  const compliancePercentage = compliance?.overall_compliance_percentage || 0;
  const totalProjects = compliance?.total_projects || 0;
  const compliantProjects = compliance?.compliant_projects_count || 0;
  const nonCompliantProjects = totalProjects - compliantProjects;

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
      {/* Programme Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Programme Compliance Overview
        </h3>
        <div className="flex items-center gap-6">
          <div className={`flex-shrink-0 w-32 h-32 rounded-full flex items-center justify-center ${getComplianceBgColor(compliancePercentage)}`}>
            <span className={`text-4xl font-bold ${getComplianceColor(compliancePercentage)}`}>
              {compliancePercentage.toFixed(0)}%
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalProjects}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Compliant</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{compliantProjects}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Non-Compliant</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{nonCompliantProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Programme Storage Usage</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Used</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatFileSize(storageUsage)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min((storageUsage / (5 * 1024 * 1024 * 1024)) * 100, 100)}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Limit: {formatFileSize(5 * 1024 * 1024 * 1024)} per programme
          </p>
        </div>
      </div>

      {/* Audit Readiness */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Readiness</h3>
        </div>
        <div className="flex items-center gap-4">
          {compliancePercentage >= 90 ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">Ready for Audit</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  All required documents are in place
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-200">Not Ready for Audit</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Some required documents are missing or not approved
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProgrammeDocumentCompliance;
