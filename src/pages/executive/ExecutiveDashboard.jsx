/**
 * Executive Dashboard
 * Read-only strategic KPI view for the executive role.
 * Route: /platform/executive/dashboard
 */

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Activity, DollarSign, Users } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const card = 'rounded-lg border border-gray-700 bg-gray-800 p-5 shadow-sm';
const kpiCard = `${card} flex items-center gap-4`;

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div className={kpiCard}>
      <div className={`rounded-full p-3 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ count: projectCount }, { count: riskCount }, { count: issueCount }] =
          await Promise.all([
            platformDb.from('projects').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
            platformDb.from('risks').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'open'),
            platformDb.from('issues').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'open'),
          ]);
        setStats({ projectCount, riskCount, issueCount });
      } catch {
        setStats({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-1">Executive Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">Strategic portfolio overview — read-only</p>

      {loading ? (
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

          <div className={`${card} text-gray-400 text-sm`}>
            <p>This dashboard provides a read-only strategic view. Navigate to Portfolio, Programme, or Reports for detailed data.</p>
          </div>
        </>
      )}
    </div>
  );
}
