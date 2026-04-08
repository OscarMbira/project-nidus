/**
 * Document Compliance Widget
 * 
 * Displays document compliance summary for PMO Dashboard:
 * - Missing mandatory documents count
 * - Pending approvals count
 * - Overdue documents count
 * - Projects with compliance issues
 */

import { useState, useEffect, memo } from 'react';
import { FileX, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjectComplianceSummary, getOverdueApprovals } from '../../../services/documentGovernanceService';
import { platformDb } from '../../../services/supabase/supabaseClient';

const DocumentComplianceWidget = memo(function DocumentComplianceWidget({ organizationId }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    missingMandatory: 0,
    pendingApprovals: 0,
    overdueDocuments: 0,
    projectsWithIssues: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (organizationId) {
      loadComplianceStats();
    }
  }, [organizationId]);

  const loadComplianceStats = async () => {
    try {
      setLoading(true);
      
      // Get compliance summary for all projects in the organization
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userRecord) return;

      // Get projects for this organization
      const { data: projects } = await platformDb
        .from('projects')
        .select('id')
        .eq('account_id', organizationId)
        .eq('is_deleted', false);

      if (!projects || projects.length === 0) {
        setStats({ missingMandatory: 0, pendingApprovals: 0, overdueDocuments: 0, projectsWithIssues: 0 });
        setLoading(false);
        return;
      }

      // Get compliance summary for each project
      let missingCount = 0;
      let pendingCount = 0;
      let projectsWithIssues = 0;

      for (const project of projects) {
        try {
          const summary = await getProjectComplianceSummary(project.id);
          if (summary) {
            if (summary.missing_mandatory_count > 0) {
              missingCount += summary.missing_mandatory_count;
              projectsWithIssues++;
            }
            if (summary.pending_approval_count > 0) {
              pendingCount += summary.pending_approval_count;
            }
          }
        } catch (err) {
          console.warn(`Failed to get compliance for project ${project.id}:`, err);
        }
      }

      // Get overdue approvals
      const overdueDocs = await getOverdueApprovals(100);
      const overdueCount = overdueDocs?.length || 0;

      setStats({
        missingMandatory: missingCount,
        pendingApprovals: pendingCount,
        overdueDocuments: overdueCount,
        projectsWithIssues
      });
    } catch (error) {
      console.error('Error loading compliance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Document Compliance</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const hasIssues = stats.missingMandatory > 0 || stats.pendingApprovals > 0 || stats.overdueDocuments > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Document Compliance</h3>
        <button
          onClick={() => navigate('/platform/document-compliance')}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View Details →
        </button>
      </div>

      {!hasIssues ? (
        <div className="flex items-center gap-3 text-green-400 py-4">
          <CheckCircle className="h-6 w-6" />
          <span className="text-sm font-medium">All documents compliant</span>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.missingMandatory > 0 && (
            <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileX className="h-5 w-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-red-400">Missing Mandatory Documents</div>
                  <div className="text-xs text-gray-400">{stats.projectsWithIssues} project(s) affected</div>
                </div>
              </div>
              <div className="text-xl font-bold text-red-400">{stats.missingMandatory}</div>
            </div>
          )}

          {stats.pendingApprovals > 0 && (
            <div className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-400" />
                <div>
                  <div className="text-sm font-medium text-yellow-400">Pending Approvals</div>
                  <div className="text-xs text-gray-400">Awaiting review</div>
                </div>
              </div>
              <div className="text-xl font-bold text-yellow-400">{stats.pendingApprovals}</div>
            </div>
          )}

          {stats.overdueDocuments > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-sm font-medium text-orange-400">Overdue Documents</div>
                  <div className="text-xs text-gray-400">Past due date</div>
                </div>
              </div>
              <div className="text-xl font-bold text-orange-400">{stats.overdueDocuments}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DocumentComplianceWidget;
