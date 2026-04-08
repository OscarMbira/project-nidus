/**
 * Document Compliance Page
 * 
 * Compliance dashboard for document governance
 */

import { useState, useEffect } from 'react';
import DocumentComplianceDashboard from '../../components/app/dashboard/DocumentComplianceDashboard';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function DocumentCompliancePage() {
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Compliance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track document compliance, approvals, and audit readiness
        </p>
      </div>
      {organizationId && (
        <DocumentComplianceDashboard organizationId={organizationId} />
      )}
    </div>
  );
}
