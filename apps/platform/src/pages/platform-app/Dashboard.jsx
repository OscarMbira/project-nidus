/**
 * Platform Application Dashboard
 * Route: /platform/dashboard
 *
 * v982 Phase 5 follow-up: this component's job is now purely to resolve WHICH persona home to
 * render (Freelancer / PMO Admin / redirect to PM) — the PMO Executive Summary content itself
 * (Executive Summary + AI Insights + Executive Alerts + PMODashboardScopeTabs, plus the wave-1/
 * wave-2 analytics fetch that feeds them) moved into PmoAdminHome.jsx +
 * components/dashboard/widgets/PmoAdminOverviewWidget.jsx, framework-composed like every other
 * persona home this initiative built. This file no longer owns any PMO-content data-fetching —
 * see PmoAdminOverviewWidget.jsx for that (same content, same fetch orchestration, just moved).
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { platformDb } from '@nidus/supabase';
import { resolveAccountIdForAuthUser } from '@nidus/shared/utils/accountResolution';
import { getUserSystemRoles } from '../../services/roleService';
import { PMO_LAYOUT_ROLES, getCachedUserMenuRoles } from '@nidus/shared/utils/menuLayoutUtils';
import FreelancerHome from '../dashboard/FreelancerHome';
import PmoAdminHome from '../dashboard/PmoAdminHome';

const PlatformDashboard = memo(function PlatformDashboard() {
  const [authReady, setAuthReady] = useState(false);
  const [accountStatus, setAccountStatus] = useState('loading'); // loading | ready | missing
  const [organizationId, setOrganizationId] = useState(null);
  const [profileLinked, setProfileLinked] = useState(true);
  const [userName, setUserName] = useState('');
  // null = not yet resolved. Executive Summary is PMO/org-admin only.
  // Project-level roles (e.g. project_manager) often exist in user_roles for menus/badge,
  // so "any user_roles row" is NOT a valid gate — use PMO_LAYOUT_ROLES instead.
  const [canSeeExecutiveDashboard, setCanSeeExecutiveDashboard] = useState(null);
  // v982 Phase 5 — Role-Aware Home Pages: an 'individual' account (freelancer/solo user, v918
  // registration's "For myself" path) gets the new framework-composed Freelancer Home instead of
  // the PMO Executive Summary, even though they hold pmo_admin (v918 always grants it to a solo
  // user — "no one else exists to hold it"). null = not yet resolved.
  const [isIndividualAccount, setIsIndividualAccount] = useState(null);
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

      const [accountId, orgAdmin, systemRolesResult] = await Promise.all([
        resolveAccountIdForAuthUser(user.id, userRecord.id),
        checkIsOrgAdmin(user.id),
        getUserSystemRoles(user.id),
      ]);

      if (accountId) {
        setOrganizationId(accountId);
        setAccountStatus('ready');
        // v982 Phase 5: resolve account_type in parallel with the rest of this function's own
        // remaining work — does not block canSeeExecutiveDashboard's own resolution below, since
        // an individual account still needs that computed (it's used as a fallback if the
        // account_type fetch itself fails, see the render branch below).
        platformDb
          .from('accounts')
          .select('account_type')
          .eq('id', accountId)
          .maybeSingle()
          .then(({ data }) => setIsIndividualAccount(data?.account_type === 'individual'))
          .catch(() => setIsIndividualAccount(false));
      } else {
        setOrganizationId(null);
        setAccountStatus('missing');
        setIsIndividualAccount(false);
      }

      // Prefer warm sidebar role cache for an immediate deny (avoids painting then redirecting).
      const cachedNames = getCachedUserMenuRoles(user.id)?.roleNames || [];
      const roleNames = (
        cachedNames.length
          ? cachedNames
          : (systemRolesResult.success ? systemRolesResult.data : [])
              .map((a) => a.roles?.role_name)
              .filter(Boolean)
      ).map((n) => String(n).trim().toLowerCase().replace(/\s+/g, '_'));
      setCanSeeExecutiveDashboard(
        orgAdmin === true || roleNames.some((r) => PMO_LAYOUT_ROLES.has(r)),
      );
    } catch (error) {
      console.error('Error loading user and organization:', error);
      setAccountStatus('missing');
    }
  }, [navigate, checkIsOrgAdmin]);

  useEffect(() => {
    loadUserAndOrganization();
  }, [loadUserAndOrganization]);

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

  // v982 Phase 5: an individual/freelancer account gets the framework-composed Freelancer Home,
  // regardless of the PMO_LAYOUT_ROLES check below — checked BEFORE that gate since an individual
  // account holds pmo_admin and would otherwise fall into the PMO Admin Home branch.
  if (isIndividualAccount === true) {
    return <FreelancerHome />;
  }

  // Project Manager / other non-PMO roles → PM dashboard (not org-wide PMO Admin Home).
  if (canSeeExecutiveDashboard === false) {
    return <Navigate to="/pm/dashboard" replace />;
  }

  // Do not paint PMO Admin Home until the role gate (AND the individual-account check above) has
  // resolved.
  if (canSeeExecutiveDashboard !== true || isIndividualAccount === null) {
    return null;
  }

  return <PmoAdminHome />;
});

export default PlatformDashboard;
