/**
 * Document Governance Main Page
 * 
 * Main landing page for document governance module
 */

import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import DocumentComplianceDashboard from '../../components/app/dashboard/DocumentComplianceDashboard';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function DocumentGovernance() {
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        // Get organization/account ID
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .maybeSingle();

        if (account) {
          setOrganizationId(account.id);
        }
      }
    } catch (err) {
      console.error('Error loading organization:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Governance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and track project documents, compliance, and approvals
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/platform/document-governance/register"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
        >
          <FileText className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Document Register
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage all project documents
          </p>
        </Link>

        <Link
          to="/platform/document-governance/compliance"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
        >
          <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Compliance Dashboard
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track document compliance and approvals
          </p>
        </Link>

        <Link
          to="/platform/document-governance/programme"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
        >
          <FileCheck className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Programme Documents
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Programme-level document compliance
          </p>
        </Link>
      </div>

      {/* Compliance Overview */}
      {organizationId && (
        <DocumentComplianceDashboard organizationId={organizationId} />
      )}
    </div>
  );
}
