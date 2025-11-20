import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { calculatePortfolioMetrics } from '../../services/metricsCalculator';
import MetricCard from './MetricCard';
import TrendChart from './TrendChart';

export default function PortfolioAnalyticsDashboard({ portfolioId = null }) {
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [portfolioId]);

  useEffect(() => {
    if (projects.length > 0) {
      calculateMetrics();
    }
  }, [projects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('projects')
        .select(`
          id,
          project_name,
          project_code,
          project_status,
          start_date,
          end_date,
          budget,
          actual_cost,
          completion_percentage
        `)
        .eq('is_deleted', false);

      if (portfolioId) {
        // If portfolio ID provided, filter by portfolio projects
        const { data: portfolioProjects } = await supabase
          .from('portfolio_projects')
          .select('project_id')
          .eq('portfolio_id', portfolioId)
          .eq('is_deleted', false);

        if (portfolioProjects && portfolioProjects.length > 0) {
          const projectIds = portfolioProjects.map(p => p.project_id);
          query = query.in('id', projectIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // No projects
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Calculate performance metrics for each project
      const projectsWithMetrics = (data || []).map(project => ({
        ...project,
        schedule_performance: calculateSchedulePerformance(project),
        cost_performance: calculateCostPerformance(project),
        health_score: calculateHealthScore(project),
      }));

      setProjects(projectsWithMetrics);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSchedulePerformance = (project) => {
    if (!project.start_date || !project.end_date) return null;
    const today = new Date();
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    
    const totalDuration = end - start;
    const elapsed = today - start;
    
    if (totalDuration <= 0) return null;
    
    const plannedProgress = (elapsed / totalDuration) * 100;
    const actualProgress = project.completion_percentage || 0;
    
    if (plannedProgress === 0) return null;
    return actualProgress / plannedProgress;
  };

  const calculateCostPerformance = (project) => {
    if (!project.budget || !project.actual_cost) return null;
    if (project.budget === 0) return null;
    return project.actual_cost / project.budget;
  };

  const calculateHealthScore = (project) => {
    const schedule = project.schedule_performance || 1;
    const cost = project.cost_performance || 1;
    const completion = (project.completion_percentage || 0) / 100;
    
    const scheduleScore = Math.min(schedule * 100, 100);
    const costScore = Math.max(0, 100 - ((cost - 1) * 100));
    
    return (scheduleScore * 0.4 + costScore * 0.4 + completion * 100 * 0.2);
  };

  const calculateMetrics = () => {
    const portfolioMetrics = calculatePortfolioMetrics(projects);
    setMetrics(portfolioMetrics);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics || projects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Portfolio Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {portfolioId ? 'No projects in this portfolio' : 'No projects available'}
        </p>
      </div>
    );
  }

  const budgetVariance = metrics.totalBudget > 0
    ? ((metrics.totalSpent - metrics.totalBudget) / metrics.totalBudget) * 100
    : 0;

  const onTimePercentage = metrics.totalProjects > 0
    ? (metrics.onTimeProjects / metrics.totalProjects) * 100
    : 0;

  const onBudgetPercentage = metrics.totalProjects > 0
    ? (metrics.onBudgetProjects / metrics.totalProjects) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Projects"
          value={metrics.totalProjects}
          displayFormat="number"
          status="neutral"
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          displayFormat="number"
          status={metrics.activeProjects > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          title="Completed Projects"
          value={metrics.completedProjects}
          displayFormat="number"
          status={metrics.completedProjects > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          title="Average Health Score"
          value={metrics.averageHealthScore || 0}
          displayFormat="number"
          status={metrics.averageHealthScore >= 80 ? 'good' : metrics.averageHealthScore >= 60 ? 'warning' : 'critical'}
          targetValue={80}
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Budget"
          value={metrics.totalBudget}
          displayFormat="currency"
          status="neutral"
        />
        <MetricCard
          title="Total Spent"
          value={metrics.totalSpent}
          displayFormat="currency"
          status={budgetVariance <= 0 ? 'good' : budgetVariance <= 10 ? 'warning' : 'critical'}
          trendPercentage={budgetVariance}
        />
        <MetricCard
          title="Budget Variance"
          value={budgetVariance}
          displayFormat="percentage"
          status={budgetVariance <= 0 ? 'good' : budgetVariance <= 10 ? 'warning' : 'critical'}
          targetValue={0}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              On-Time Projects
            </h3>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.onTimeProjects} / {metrics.totalProjects}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-green-600 h-4 rounded-full transition-all"
              style={{ width: `${onTimePercentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {onTimePercentage.toFixed(1)}% on schedule
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              On-Budget Projects
            </h3>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.onBudgetProjects} / {metrics.totalProjects}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${onBudgetPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {onBudgetPercentage.toFixed(1)}% within budget
          </div>
        </div>
      </div>

      {/* Project Status Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Project Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['planning', 'in-progress', 'on-hold', 'completed'].map(status => {
            const count = projects.filter(p => p.project_status === status).length;
            const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
            
            return (
              <div key={status} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                  {status.replace('-', ' ')}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Projects */}
      {projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top Performing Projects
          </h3>
          <div className="space-y-3">
            {projects
              .sort((a, b) => (b.health_score || 0) - (a.health_score || 0))
              .slice(0, 5)
              .map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {project.project_name}
                    </div>
                    {project.project_code && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {project.project_code}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        (project.health_score || 0) >= 80 ? 'text-green-600 dark:text-green-400' :
                        (project.health_score || 0) >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(project.health_score || 0)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Health Score
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

