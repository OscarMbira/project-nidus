/**
 * Executive Dashboard
 * Read-only strategic KPI view for the executive role.
 * Route: /platform/executive/dashboard
 *
 * Non-executive roles redirect to /pm/dashboard without painting this page.
 * PM sidebar links are also rewritten to /pm/dashboard (sidebarRouteUtils).
 */

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, CheckCircle, Activity, DollarSign, Users } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { PMO_LAYOUT_ROLES, getCachedUserMenuRoles } from '@nidus/shared/utils/menuLayoutUtils';
import { getUserSystemRoles } from '../../services/roleService';

const card =
  'rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-5 shadow-sm';
const kpiCard = `${card} flex items-center gap-4`;

const EXECUTIVE_VIEW_ROLES = new Set([...PMO_LAYOUT_ROLES, 'executive']);

function normalizeRoleName(roleName) {
  return String(roleName || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function rolesAllowExecutiveView(roleNames = []) {
  return (roleNames || []).map(normalizeRoleName).some((role) => EXECUTIVE_VIEW_ROLES.has(role));
}

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div className={kpiCard}>
      <div className={`rounded-full p-3 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState(null);
  // null = unresolved (paint nothing); false = redirect; true = show page
  const [canView, setCanView] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { session } } = await platformDb.auth.getSession();
        const user = session?.user;
        if (!user) {
          if (!cancelled) setCanView(false);
          return;
        }

        // Instant path when Sidebar / useMenu already cached roles for this user.
        const cached = getCachedUserMenuRoles(user.id);
        if (cached?.roleNames?.length) {
          const allowed = rolesAllowExecutiveView(cached.roleNames);
          if (!cancelled) setCanView(allowed);
          if (!allowed) return;
        } else {
          const rolesResult = await getUserSystemRoles(user.id);
          if (cancelled) return;
          const roleNames = (rolesResult?.success ? rolesResult.data : [])
            .map((assignment) => assignment.roles?.role_name)
            .filter(Boolean);
          const allowed = rolesAllowExecutiveView(roleNames);
          setCanView(allowed);
          if (!allowed) return;
        }

        const [{ count: projectCount }, { count: riskCount }, { count: issueCount }] =
          await Promise.all([
            platformDb.from('projects').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
            platformDb.from('risks').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'open'),
            platformDb.from('issues').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'open'),
          ]);
        if (!cancelled) setStats({ projectCount, riskCount, issueCount });
      } catch {
        if (!cancelled) setCanView(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (canView === false) {
    return <Navigate to="/pm/dashboard" replace />;
  }

  // Unresolved: render nothing so PMs never see Executive heading/content.
  if (canView !== true) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-1">Executive Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Strategic portfolio overview — read-only</p>

      {!stats ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <KPICard icon={Activity}       label="Active Projects"  value={stats?.projectCount} color="bg-blue-600" />
            <KPICard icon={AlertTriangle}  label="Open Risks"        value={stats?.riskCount}    color="bg-orange-500" />
            <KPICard icon={CheckCircle}    label="Open Issues"       value={stats?.issueCount}   color="bg-red-500" />
            <KPICard icon={TrendingUp}     label="Portfolio Health"  value="View Analytics"      color="bg-green-600" />
            <KPICard icon={DollarSign}     label="Budget Overview"   value="View Reports"        color="bg-purple-600" />
            <KPICard icon={Users}          label="Benefits Pipeline" value="View Pipeline"       color="bg-teal-600" />
          </div>

          <div className={`${card} text-gray-600 dark:text-gray-400 text-sm`}>
            <p>This dashboard provides a read-only strategic view. Navigate to Portfolio, Programme, or Reports for detailed data.</p>
          </div>
        </>
      )}
    </div>
  );
}
