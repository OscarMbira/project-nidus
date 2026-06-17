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
import { Link, useNavigate } from 'react-router-dom';
import { platformDb } from '../../services/supabase/supabaseClient';
import { resolveAccountIdForAuthUser } from '../../utils/accountResolution';
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
  const [authReady, setAuthReady] = useState(false);
  const [accountStatus, setAccountStatus] = useState('loading'); // loading | ready | missing
  const [organizationId, setOrganizationId] = useState(null);
  const [profileLinked, setProfileLinked] = useState(true);
  const [userName, setUserName] = useState('');
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const navigate = useNavigate();

  const checkIsOrgAdmin = useCallback(async (authUserId) => {
    try {
      const { data, error } = await platformDb.rpc('is_user_pmo_admin', {
        p_auth_uuid: authUserId,
      });
      if (!error) return data === true;
    } catch {
      // fall through
    }
    return false;
  }, []);

  const loadUserAndOrganization = useCallback(async () => {
    try {
      setAccountStatus('loading');

      const { data: { user }, error: userError } = await platformDb.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        navigate('/auth/login');
        return;
      }

      setUserName(user.email || '');
      setAuthReady(true);

      let { data: userRecord } = await platformDb
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRecord) {
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
        setProfileLinked(false);
        setAccountStatus('missing');
        return;
      }

      setProfileLinked(true);
      setUserName(userRecord.full_name || user.email);

      const [accountId, orgAdmin] = await Promise.all([
        resolveAccountIdForAuthUser(user.id, userRecord.id),
        checkIsOrgAdmin(user.id),
      ]);

      if (accountId) {
        setOrganizationId(accountId);
        setAccountStatus('ready');
      } else {
        setOrganizationId(null);
        setAccountStatus('missing');
      }

      setIsOrgAdmin(orgAdmin);
    } catch (error) {
      console.error('Error loading user and organization:', error);
      setAccountStatus('missing');
    }
  }, [navigate, checkIsOrgAdmin]);

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

  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (accountStatus === 'missing') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {!profileLinked
              ? 'Your login is not linked to a platform user profile yet.'
              : 'No organisation account is linked to your user yet.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {!profileLinked
              ? 'Complete account linking, then set up or join an organisation.'
              : 'Create an organisation if you are the account owner, or ask your PMO admin to add you to a project.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!profileLinked ? (
              <button
                type="button"
                onClick={() => loadUserAndOrganization()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Retry profile link
              </button>
            ) : (
              <Link
                to="/onboarding/organisation-setup"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Set up organisation
              </Link>
            )}
            <Link
              to="/platform/projects"
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Go to projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {headerContent}

        {accountStatus === 'loading' ? (
          <div className="space-y-8">
            <ComponentLoader />
            <ComponentLoader />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
});

export default PlatformDashboard;
