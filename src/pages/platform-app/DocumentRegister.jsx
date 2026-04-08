/**
 * Document Register Page
 * 
 * Full register view of all project documents
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DocumentRegister from '../../components/app/dashboard/DocumentRegister';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function DocumentRegisterPage() {
  const { projectId: projectIdParam } = useParams();
  const [projectId, setProjectId] = useState(projectIdParam || null);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Register</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage all project documents by stage
        </p>
      </div>
      {projectId ? (
        <DocumentRegister 
          projectId={projectId} 
          organizationId={organizationId}
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Please select a project to view its documents
          </p>
        </div>
      )}
    </div>
  );
}
