/**
 * Quality Module
 * Quality management and assurance
 * Route: /platform/quality
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Search, CheckCircle, FileCheck, AlertCircle } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function Quality() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

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
          .single();

        if (account) {
          setOrganizationId(account.id);
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading quality...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-gray-100">Quality</h1>
          </div>
          <p className="text-gray-400">Quality management and assurance processes</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
          <div className="text-center max-w-2xl mx-auto">
            <Award className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-100 mb-3">Quality Module</h2>
            <p className="text-gray-400 mb-6">
              Quality management features are being enhanced. Basic functionality is available through project quality registers.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left mt-8">
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <Award className="h-6 w-6 text-orange-400 mb-2" />
                <h3 className="font-semibold text-gray-200 mb-1">Quality Standards</h3>
                <p className="text-sm text-gray-400">Define and enforce quality standards</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <CheckCircle className="h-6 w-6 text-orange-400 mb-2" />
                <h3 className="font-semibold text-gray-200 mb-1">Quality Assurance</h3>
                <p className="text-sm text-gray-400">Plan and conduct QA reviews</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <FileCheck className="h-6 w-6 text-orange-400 mb-2" />
                <h3 className="font-semibold text-gray-200 mb-1">Defect Tracking</h3>
                <p className="text-sm text-gray-400">Track quality issues and defects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
