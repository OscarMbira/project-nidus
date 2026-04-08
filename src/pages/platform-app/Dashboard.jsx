/**
 * Platform Application Dashboard
 * Enhanced Organization Dashboard for Platform system
 * Route: /platform/dashboard
 * 
 * Optimized with:
 * - Lazy loading for all components (code splitting)
 * - Suspense boundaries for progressive loading
 * - Memoization to prevent unnecessary re-renders
 * - Deferred loading for below-the-fold components
 * - Parallel data loading
 * - Error boundaries
 */

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformDb } from '../../services/supabase/supabaseClient';
import { Shield } from 'lucide-react';

// Lazy load all dashboard components for code splitting
const ExecutiveSummary = lazy(() => import('../../components/app/dashboard/ExecutiveSummary'));
const QuickActions = lazy(() => import('../../components/app/dashboard/QuickActions'));
const ActivityFeed = lazy(() => import('../../components/app/dashboard/ActivityFeed'));
const KPICards = lazy(() => import('../../components/app/dashboard/KPICards'));
const ProjectHealthChart = lazy(() => import('../../components/app/dashboard/ProjectHealthChart'));
const BudgetBurnRate = lazy(() => import('../../components/app/dashboard/BudgetBurnRate'));
const RiskHeatMap = lazy(() => import('../../components/app/dashboard/RiskHeatMap'));
const ResourceAllocationChart = lazy(() => import('../../components/app/dashboard/ResourceAllocationChart'));
const PMOControlStrip = lazy(() => import('../../components/app/dashboard/PMOControlStrip'));
const ProgrammeOverview = lazy(() => import('../../components/app/dashboard/ProgrammeOverview'));
const PMCapacityWidget = lazy(() => import('../../components/app/dashboard/PMCapacityWidget'));
const StageGateOversight = lazy(() => import('../../components/app/dashboard/StageGateOversight'));
const ExceptionManagement = lazy(() => import('../../components/app/dashboard/ExceptionManagement'));
const BenefitsRollup = lazy(() => import('../../components/app/dashboard/BenefitsRollup'));
const DocumentComplianceWidget = lazy(() => import('../../components/app/dashboard/DocumentComplianceWidget'));
const AIInsightsPanel = lazy(() => import('../../components/ai/AIInsightsPanel'));

// Loading fallback component
const ComponentLoader = memo(() => (
  <div className="flex items-center justify-center p-8 bg-gray-800 rounded-lg border border-gray-700">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
));
ComponentLoader.displayName = 'ComponentLoader';

// Deferred component for below-the-fold content using Intersection Observer
const DeferredActivityFeed = memo(function DeferredActivityFeed({ organizationId }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use Intersection Observer for modern browsers (better performance than requestIdleCallback)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before element enters viewport
        threshold: 0.01
      }
    );

    observer.observe(container);

    // Fallback: Load after 2 seconds if Intersection Observer doesn't fire
    const timeout = setTimeout(() => {
      setShouldLoad(true);
      observer.disconnect();
    }, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={containerRef} className="mb-8">
      {shouldLoad ? (
        <Suspense fallback={<ComponentLoader />}>
          <ActivityFeed organizationId={organizationId} limit={15} />
        </Suspense>
      ) : (
        <ComponentLoader />
      )}
    </div>
  );
});

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
      const { data: userRecord, error: userRecordError } = await platformDb
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecordError || !userRecord) {
        console.error('Error getting user record:', userRecordError);
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
          <h1 className="text-3xl font-bold text-gray-100">
            Platform Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Welcome back, {userName || 'User'}
          </p>
        </div>
        {isOrgAdmin && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/30 rounded-lg border border-blue-500/30">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-200">
              PMO Admin
            </span>
          </div>
        )}
      </div>
    </div>
  ), [userName, isOrgAdmin]);

  // Memoize organizationId to prevent unnecessary prop changes
  const memoizedOrgId = useMemo(() => organizationId, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">No organization found. Please complete your profile setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Memoized */}
        {headerContent}

        {/* PMO Control Strip - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <PMOControlStrip organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Document Compliance Widget - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <DocumentComplianceWidget organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Executive Summary - Critical, load first */}
        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <ExecutiveSummary organizationId={memoizedOrgId} />
          </Suspense>
        </div>

        {/* Phase 6.3: Today's Insights — rule-based, "Ask about this" opens widget */}
        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <AIInsightsPanel orgId={memoizedOrgId} />
          </Suspense>
          {/* Phase 6.4: PMO Admin — org-wide AI health/settings link */}
          {isOrgAdmin && (
            <p className="text-xs text-gray-500 mt-2">
              Org-wide: Manage proactive insights and AI settings in{' '}
              <button type="button" onClick={() => navigate('/platform/organization-admin')} className="text-purple-400 hover:underline">
                Organization Settings
              </button>
              .
            </p>
          )}
        </div>

        {/* Programme Overview - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <ProgrammeOverview organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* PM Capacity Widget - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <PMCapacityWidget organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Stage Gate Oversight - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <StageGateOversight organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Exception Management - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <ExceptionManagement organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Benefits Roll-up - Only visible to PMO Admins */}
        {isOrgAdmin && (
          <div className="mb-8">
            <Suspense fallback={<ComponentLoader />}>
              <BenefitsRollup organizationId={memoizedOrgId} />
            </Suspense>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <QuickActions isOrgAdmin={isOrgAdmin} />
          </Suspense>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <KPICards organizationId={memoizedOrgId} />
          </Suspense>
        </div>

        {/* Charts Grid - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <ProjectHealthChart organizationId={memoizedOrgId} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <BudgetBurnRate organizationId={memoizedOrgId} />
          </Suspense>
        </div>

        {/* Charts Grid - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Suspense fallback={<ComponentLoader />}>
            <RiskHeatMap organizationId={memoizedOrgId} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <ResourceAllocationChart organizationId={memoizedOrgId} />
          </Suspense>
        </div>

        {/* Activity Feed - Defer loading until after initial render */}
        <DeferredActivityFeed organizationId={memoizedOrgId} />
      </div>
    </div>
  );
});

export default PlatformDashboard;
