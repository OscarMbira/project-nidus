/**
 * Reports & Analytics Module
 * Report Library and Analytics Dashboards
 * Route: /platform/reports
 * Optimized with memoization and useCallback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBar, FileText, BarChart3, Calendar, Search, Filter, Plus, TrendingUp } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);

  // Memoize loadOrganization with useCallback
  const loadOrganization = useCallback(async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user's account
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        // Get account from projects or accounts table
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
  }, [navigate]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  // Memoize quick actions to prevent recreation
  const quickActions = useMemo(() => [
    {
      icon: FileText,
      title: 'Report Library',
      description: 'Browse and run pre-built report templates',
      onClick: () => navigate('/platform/reports'),
    },
    {
      icon: BarChart3,
      title: 'Report Builder',
      description: 'Create custom reports with drag-and-drop interface',
      onClick: () => navigate('/platform/reports/builder'),
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboards',
      description: 'View executive and project analytics dashboards',
      onClick: () => navigate('/platform/reports/analytics'),
    },
  ], [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChartBar className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Reports & Analytics</h1>
            </div>
            <button
              onClick={() => navigate('/platform/reports/builder')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Report
            </button>
          </div>
          <p className="text-gray-400">
            Access pre-built reports, create custom reports, and view analytics dashboards
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-colors text-left"
              >
                <IconComponent className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-xl font-semibold text-gray-100 mb-2">{action.title}</h3>
                <p className="text-gray-400 text-sm">
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
          <div className="text-center max-w-2xl mx-auto">
            <ChartBar className="h-20 w-20 text-purple-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-100 mb-3">
              Reports Module Coming Soon
            </h2>
            <p className="text-gray-400 mb-6">
              The Reports & Analytics module is being enhanced with full functionality.
              Components are ready and integration is in progress.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/platform/reports/builder')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Try Report Builder
              </button>
              <button
                onClick={() => navigate('/platform/dashboard')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

