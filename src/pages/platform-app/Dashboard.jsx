/**
 * Platform Application Dashboard
 * Enhanced Organization Dashboard for Platform system
 * Route: /platform/dashboard
 * 
 * Optimized with:
 * - Lazy loading for all components (code splitting)
 * - Suspense boundaries for progressive loading
 * - Memoization to prevent unnecessary re-renders
 * - Overview: Executive Summary → AI Insights → Executive alerts (risk / resources / activity rail only on Portfolio / Programmes / Projects tabs)
 * - Analytics: wave 1 = getExecutiveSummary + getKPIs (paint Overview quickly); wave 2 = getPmoExtendedMetrics (background)
 * - Tab switches wrapped in startTransition (PMODashboardScopeTabs)
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getExecutiveSummary, getKPIs, getPmoExtendedMetrics } from '../../services/dashboardService';
import { Shield } from 'lucide-react';
import PMODashboardScopeTabs from '../../components/app/dashboard/PMODashboardScopeTabs';

// Lazy load all dashboard components for code splitting
const ExecutiveSummary = lazy(() => import('../../components/app/dashboard/ExecutiveSummary'));
const AIInsightsPanel = lazy(() => import('../../components/ai/AIInsightsPanel'));
const PMOExecutiveAlertsPanel = lazy(() => import('../../components/app/dashboard/PMOExecutiveAlertsPanel'));

// Loading fallback component
const ComponentLoader = memo(() => (
  <div className="flex items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
));
ComponentLoader.displayName = 'ComponentLoader';

const PlatformDashboard = memo(function PlatformDashboard() {
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const navigate = useNavigate();

  // Memoize user loading function to prevent recreation on every render
  const loadUserAndOrganization = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await platformDb.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);

      // Get user details
      let { data: userRecord } = await platformDb
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRecord) {
        // auth_user_id not linked yet (invited user) — call SECURITY DEFINER repair then retry
        await platformDb.rpc('link_auth_account');
        const { data: retried } = await platformDb
          .from('users')
          .select('id, full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        userRecord = retried;
      }

      if (!userRecord) {
        console.error('Error getting user record: auth_user_id not linked');
        setLoading(false);
        return;
      }

      setUserName(userRecord.full_name || user.email);

      // Helper function to get account_id with fallback strategy
      const getAccountId = async () => {
        // Try 1: Get account where user is owner (most common case)
        const { data: ownedAccount } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .maybeSingle();
        
        if (ownedAccount?.id) return ownedAccount.id;
        
        // Try 2: Get account from user_roles -> projects (user is member of a project)
        const { data: userRole } = await platformDb
          .from('user_roles')
          .select('projects!inner(account_id)')
          .eq('user_id', userRecord.id)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .not('projects.account_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (userRole?.projects?.account_id) return userRole.projects.account_id;
        
        // Try 3: Get account from projects where user is project manager
        const { data: project } = await platformDb
          .from('projects')
          .select('account_id')
          .eq('project_manager_user_id', userRecord.id)
          .not('account_id', 'is', null)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        
        return project?.account_id || null;
      };

      // Helper function to check org admin permission
      const checkOrgAdminPermission = async () => {
        try {
          // Get user's roles in parallel with permission lookup
          const [rolesResult, permissionsResult] = await Promise.all([
            platformDb
              .from('user_roles')
              .select('role_id')
              .eq('user_id', userRecord.id)
              .eq('is_active', true)
              .eq('is_deleted', false),
            platformDb
              .from('permissions')
              .select('id, permission_code')
              .eq('permission_code', 'org.admin')
              .eq('is_active', true)
              .eq('is_deleted', false)
              .maybeSingle()
          ]);

          const { data: userRoles, error: rolesError } = rolesResult;
          const { data: orgAdminPermission, error: permError } = permissionsResult;

          if (rolesError || !userRoles || userRoles.length === 0 || permError || !orgAdminPermission) {
            return false;
          }

          const roleIds = userRoles.map(ur => ur.role_id);

          // Check if any of user's roles have org.admin permission
          const { data: rolePermissions, error: rpError } = await platformDb
            .from('role_permissions')
            .select('role_id')
            .in('role_id', roleIds)
            .eq('permission_id', orgAdminPermission.id)
            .eq('is_active', true)
            .eq('is_deleted', false)
            .limit(1);

          return !rpError && rolePermissions && rolePermissions.length > 0;
        } catch (error) {
          console.warn('Error checking org admin permission:', error);
          return false;
        }
      };

      // Parallel fetch for account_id and permissions
      const [accountResult, permissionResult] = await Promise.allSettled([
        getAccountId(),
        checkOrgAdminPermission()
      ]);

      // Set account_id from parallel fetch
      if (accountResult.status === 'fulfilled' && accountResult.value) {
        setOrganizationId(accountResult.value);
      }

      // Set org admin status from parallel fetch
      if (permissionResult.status === 'fulfilled') {
        setIsOrgAdmin(permissionResult.value);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user and organization:', error);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadUserAndOrganization();
  }, [loadUserAndOrganization]);


  // Memoize header content to prevent re-renders
  const headerContent = useMemo(() => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Platform Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, {userName || 'User'}
          </p>
        </div>
        {isOrgAdmin && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-500/30">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              PMO Admin
            </span>
          </div>
        )}
      </div>
    </div>
  ), [userName, isOrgAdmin]);

  // Memoize organizationId to prevent unnecessary prop changes
  const memoizedOrgId = useMemo(() => organizationId, [organizationId]);

  /** Wave 1: executive + KPIs (fast). Wave 2: extended metrics in background — avoids blocking on EVM/CP/risk + heavy joins. */
  const [pmoAnalyticsBundle, setPmoAnalyticsBundle] = useState(null);
  const [pmoAnalyticsStatus, setPmoAnalyticsStatus] = useState('idle'); // idle | loading | ok | error
  const [extendedMetricsLoading, setExtendedMetricsLoading] = useState(false);
  const [pmoExtendedLoadError, setPmoExtendedLoadError] = useState(null);

  useEffect(() => {
    if (!memoizedOrgId) {
      setPmoAnalyticsBundle(null);
      setPmoAnalyticsStatus('idle');
      setExtendedMetricsLoading(false);
      setPmoExtendedLoadError(null);
      return;
    }
    let cancelled = false;
    setPmoAnalyticsStatus('loading');
    setPmoExtendedLoadError(null);
    setExtendedMetricsLoading(false);

    (async () => {
      const [e, k] = await Promise.all([
        getExecutiveSummary(memoizedOrgId),
        getKPIs(memoizedOrgId),
      ]);
      if (cancelled) return;
      if (!e.success || !k.success) {
        setPmoAnalyticsBundle(null);
        setPmoAnalyticsStatus('error');
        return;
      }

      setPmoAnalyticsBundle({
        executive: e.data,
        kpis: k.data,
        extended: null,
      });
      setPmoAnalyticsStatus('ok');
      setExtendedMetricsLoading(true);

      try {
        const x = await getPmoExtendedMetrics(memoizedOrgId);
        if (cancelled) return;
        if (x.success) {
          setPmoAnalyticsBundle((prev) =>
            prev ? { ...prev, extended: x.data } : null
          );
          setPmoExtendedLoadError(null);
        } else {
          setPmoExtendedLoadError(x.error || 'Extended metrics could not be loaded.');
        }
      } catch (err) {
        if (!cancelled) {
          setPmoExtendedLoadError(err?.message || 'Extended metrics could not be loaded.');
        }
      } finally {
        if (!cancelled) setExtendedMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memoizedOrgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No organization found. Please complete your profile setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Memoized */}
        {headerContent}

        <PMODashboardScopeTabs
          organizationId={memoizedOrgId}
          analyticsBundle={pmoAnalyticsStatus === 'ok' ? pmoAnalyticsBundle : null}
          analyticsStatus={pmoAnalyticsStatus}
          extendedAnalyticsLoading={extendedMetricsLoading}
          isOrgAdmin={isOrgAdmin}
        >
          <>
            {/* Executive Summary — header + Portfolios / Programmes / Projects / Tasks / Teams cards */}
            <div className="mb-8">
              {pmoAnalyticsStatus === 'loading' || pmoAnalyticsStatus === 'idle' ? (
                <ComponentLoader />
              ) : (
                <Suspense fallback={<ComponentLoader />}>
                  <ExecutiveSummary
                    organizationId={memoizedOrgId}
                    initialSummary={pmoAnalyticsStatus === 'ok' ? pmoAnalyticsBundle?.executive : null}
                  />
                </Suspense>
              )}
            </div>

            {/* Today's AI Insights — between Executive Summary and Executive alerts */}
            <div className="mb-8">
              <Suspense fallback={<ComponentLoader />}>
                <AIInsightsPanel orgId={memoizedOrgId} />
              </Suspense>
              {isOrgAdmin && (
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-2">
                  Org-wide: Manage proactive insights and AI settings in{' '}
                  <button type="button" onClick={() => navigate('/platform/organization-admin')} className="text-purple-600 dark:text-purple-400 hover:underline">
                    Organization Settings
                  </button>
                  .
                </p>
              )}
            </div>

            <div className="mb-8">
              <Suspense fallback={<ComponentLoader />}>
                <PMOExecutiveAlertsPanel
                  loading={
                    pmoAnalyticsStatus === 'loading' ||
                    pmoAnalyticsStatus === 'idle' ||
                    extendedMetricsLoading
                  }
                  alertsPayload={pmoAnalyticsStatus === 'ok' ? pmoAnalyticsBundle?.extended?.alerts : null}
                  extendedLoadError={
                    pmoAnalyticsStatus === 'ok' && !extendedMetricsLoading ? pmoExtendedLoadError : null
                  }
                />
              </Suspense>
            </div>
          </>
        </PMODashboardScopeTabs>
      </div>
    </div>
  );
});

export default PlatformDashboard;
