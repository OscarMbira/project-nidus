import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { getKPIPerformanceSummary, getKPIStats } from '../../services/kpiService';
import { getAnalyticsStats, getProjectAnalyticsSummary } from '../../services/analyticsService';
import MetricCard from '../../components/analytics/MetricCard';
import TrendChart from '../../components/analytics/TrendChart';
import { supabase } from '../../services/supabaseClient';

export default function AnalyticsExecutive() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [kpiSummary, setKpiSummary] = useState([]);
  const [projectSummary, setProjectSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_status')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedProjectId) filters.project_id = selectedProjectId;

      const [summary, projectData] = await Promise.all([
        getKPIPerformanceSummary(filters),
        selectedProjectId ? getProjectAnalyticsSummary(selectedProjectId) : null,
      ]);

      setKpiSummary(summary || []);
      setProjectSummary(projectData);
    } catch (error) {
      console.error('Error fetching executive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Calculate overall metrics from KPI summary
  const onTargetKPIs = kpiSummary.filter(k => k.performance_status === 'on-target').length;
  const criticalKPIs = kpiSummary.filter(k => k.performance_status === 'critical').length;
  const totalKPIs = kpiSummary.length;
  const kpiHealthScore = totalKPIs > 0 ? (onTargetKPIs / totalKPIs) * 100 : 0;

  // Mock trend data (in real implementation, fetch historical data)
  const trendData = [
    { date: '2024-01-01', value: 85 },
    { date: '2024-02-01', value: 87 },
    { date: '2024-03-01', value: 82 },
    { date: '2024-04-01', value: 88 },
    { date: '2024-05-01', value: 90 },
    { date: '2024-06-01', value: kpiHealthScore },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Executive Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          High-level project and portfolio performance metrics
        </p>
      </div>

      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Project:
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Projects (Portfolio View)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="KPI Health Score"
          value={kpiHealthScore}
          unit="%"
          displayFormat="percentage"
          status={kpiHealthScore >= 80 ? 'good' : kpiHealthScore >= 60 ? 'warning' : 'critical'}
          targetValue={80}
          previousValue={85}
          trendPercentage={((kpiHealthScore - 85) / 85) * 100}
        />
        <MetricCard
          title="Total KPIs Tracked"
          value={totalKPIs}
          displayFormat="number"
          status={totalKPIs > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          title="KPIs On Target"
          value={onTargetKPIs}
          displayFormat="number"
          status={onTargetKPIs === totalKPIs && totalKPIs > 0 ? 'good' : onTargetKPIs > totalKPIs / 2 ? 'warning' : 'critical'}
          targetValue={totalKPIs}
          suffix={` / ${totalKPIs}`}
        />
        <MetricCard
          title="Critical KPIs"
          value={criticalKPIs}
          displayFormat="number"
          status={criticalKPIs === 0 ? 'good' : criticalKPIs < totalKPIs / 4 ? 'warning' : 'critical'}
          targetValue={0}
        />
      </div>

      {/* KPI Health Trend */}
      <div className="mb-6">
        <TrendChart
          title="KPI Health Score Trend"
          data={trendData}
          height={250}
          color="#3B82F6"
          formatValue={(val) => `${val.toFixed(1)}%`}
          formatDate={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        />
      </div>

      {/* Top Performing KPIs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Top Performing KPIs
        </h2>
        {kpiSummary.filter(k => k.performance_status === 'on-target').length > 0 ? (
          <div className="space-y-3">
            {kpiSummary
              .filter(k => k.performance_status === 'on-target')
              .slice(0, 5)
              .map(kpi => (
                <div key={kpi.kpi_id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{kpi.kpi_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{kpi.kpi_category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {kpi.latest_actual !== null && kpi.latest_actual !== undefined
                        ? kpi.latest_actual.toFixed(2)
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {kpi.current_target !== null && kpi.current_target !== undefined
                        ? kpi.current_target.toFixed(2)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No KPIs are currently on target</p>
        )}
      </div>

      {/* Critical KPIs */}
      {criticalKPIs > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Critical KPIs Requiring Attention
          </h2>
          <div className="space-y-3">
            {kpiSummary
              .filter(k => k.performance_status === 'critical')
              .map(kpi => (
                <div key={kpi.kpi_id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{kpi.kpi_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{kpi.kpi_category}</div>
                    {kpi.variance_percentage !== null && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {kpi.variance_percentage > 0 ? '+' : ''}{kpi.variance_percentage.toFixed(1)}% from target
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      {kpi.latest_actual !== null && kpi.latest_actual !== undefined
                        ? kpi.latest_actual.toFixed(2)
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {kpi.current_target !== null && kpi.current_target !== undefined
                        ? kpi.current_target.toFixed(2)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Project Summary (if project selected) */}
      {projectSummary && selectedProjectId && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Completion"
            value={projectSummary.completion_percentage}
            displayFormat="percentage"
            status={projectSummary.completion_percentage >= 90 ? 'good' : projectSummary.completion_percentage >= 70 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Budget Utilization"
            value={projectSummary.budget_utilization}
            displayFormat="percentage"
            status={projectSummary.budget_utilization <= 100 ? 'good' : projectSummary.budget_utilization <= 110 ? 'warning' : 'critical'}
            targetValue={100}
          />
          <MetricCard
            title="Schedule Performance"
            value={projectSummary.schedule_performance}
            displayFormat="percentage"
            status={projectSummary.schedule_performance >= 95 ? 'good' : projectSummary.schedule_performance >= 85 ? 'warning' : 'critical'}
            targetValue={100}
          />
          <MetricCard
            title="Quality Score"
            value={projectSummary.quality_score}
            displayFormat="number"
            status={projectSummary.quality_score >= 90 ? 'good' : projectSummary.quality_score >= 70 ? 'warning' : 'critical'}
            targetValue={90}
          />
        </div>
      )}
    </div>
  );
}

