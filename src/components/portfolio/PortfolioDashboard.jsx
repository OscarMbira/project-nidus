import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Users, Target, TrendingUp, AlertTriangle, DollarSign, Calendar, Activity } from 'lucide-react';
import { 
  getPortfolio, 
  getPortfolioProjects, 
  getLatestPortfolioMetrics,
  getPortfolioRisks 
} from '../../services/portfolioService';
import ProjectsByStatusChart from './ProjectsByStatusChart';
import ProjectsByMethodologyChart from './ProjectsByMethodologyChart';
import PortfolioHealthGauge from './PortfolioHealthGauge';
import ResourceUtilizationChart from './ResourceUtilizationChart';
import BudgetUtilizationChart from './BudgetUtilizationChart';
import RiskExposureIndicator from './RiskExposureIndicator';
import TimelineView from './TimelineView';
import StrategicAlignmentScore from './StrategicAlignmentScore';
import PmoDashboardInsightsSection from '../app/dashboard/PmoDashboardInsightsSection';

export default function PortfolioDashboard({ portfolioId }) {
  const [portfolio, setPortfolio] = useState(null);
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (portfolioId) {
      loadDashboardData();
    }
  }, [portfolioId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [portfolioData, projectsData, metricsData, risksData] = await Promise.all([
        getPortfolio(portfolioId),
        getPortfolioProjects(portfolioId),
        getLatestPortfolioMetrics(portfolioId),
        getPortfolioRisks(portfolioId, { status: 'identified' })
      ]);

      setPortfolio(portfolioData);
      setProjects(projectsData || []);
      setMetrics(metricsData);
      setRisks(risksData || []);
    } catch (err) {
      console.error('Error loading portfolio dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading dashboard: {error}</span>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  // Calculate stats from data
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.project?.project_status === 'active').length,
    completedProjects: projects.filter(p => p.project?.project_status === 'completed').length,
    onHoldProjects: projects.filter(p => p.project?.project_status === 'on_hold').length,
    totalRisks: risks.length,
    highRisks: risks.filter(r => r.risk_rating === 'critical' || r.risk_rating === 'high').length,
    healthScore: portfolio.overall_health_score || metrics?.overall_health_score || 0,
    budgetUtilization: metrics?.budget_utilization_percentage || 0,
    resourceUtilization: metrics?.resource_utilization_percentage || 0,
  };

  const organizationId = useMemo(
    () => projects[0]?.project?.account_id || null,
    [projects]
  );
  const portfolioProjectIds = useMemo(
    () => projects.map((r) => r.project?.id).filter(Boolean),
    [projects]
  );

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      subtitle: `${stats.activeProjects} active`,
      icon: FolderKanban,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Health Score',
      value: `${Math.round(stats.healthScore)}%`,
      subtitle: stats.healthScore >= 80 ? 'Healthy' : stats.healthScore >= 60 ? 'At Risk' : 'Critical',
      icon: Activity,
      color: stats.healthScore >= 80 ? 'green' : stats.healthScore >= 60 ? 'yellow' : 'red',
      bgColor: stats.healthScore >= 80 ? 'bg-green-50 dark:bg-green-900/20' : stats.healthScore >= 60 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20',
      iconColor: stats.healthScore >= 80 ? 'text-green-600 dark:text-green-400' : stats.healthScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400',
      borderColor: stats.healthScore >= 80 ? 'border-green-200 dark:border-green-800' : stats.healthScore >= 60 ? 'border-yellow-200 dark:border-yellow-800' : 'border-red-200 dark:border-red-800'
    },
    {
      title: 'Budget Utilization',
      value: `${Math.round(stats.budgetUtilization)}%`,
      subtitle: portfolio.allocated_budget ? `$${portfolio.allocated_budget.toLocaleString()}` : 'No budget set',
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Resource Utilization',
      value: `${Math.round(stats.resourceUtilization)}%`,
      subtitle: metrics?.total_resources_count ? `${metrics.total_resources_count} resources` : 'No resources',
      icon: Users,
      color: 'indigo',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-800'
    }
  ];

  const secondaryStats = [
    {
      title: 'Completed Projects',
      value: stats.completedProjects,
      icon: Target,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'On Hold Projects',
      value: stats.onHoldProjects,
      icon: Calendar,
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Total Risks',
      value: stats.totalRisks,
      subtitle: `${stats.highRisks} high/critical`,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {portfolio.portfolio_name}
          </h2>
          {portfolio.portfolio_code && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Code: {portfolio.portfolio_code}
            </p>
          )}
          {portfolio.portfolio_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {portfolio.portfolio_description}
            </p>
          )}
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} border ${card.borderColor} rounded-lg p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.iconColor} bg-white dark:bg-gray-800`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secondaryStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {organizationId && portfolioProjectIds.length > 0 && (
        <PmoDashboardInsightsSection
          organizationId={organizationId}
          filterProjectIds={portfolioProjectIds}
        />
      )}

      {/* Projects Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Projects Overview
          </h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalProjects}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.activeProjects}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {stats.completedProjects}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.onHoldProjects}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">On Hold</p>
          </div>
        </div>
      </div>

      {/* Recent Risks Alert */}
      {stats.highRisks > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              {stats.highRisks} high or critical {stats.highRisks === 1 ? 'risk' : 'risks'} require attention
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Projects by Status Chart */}
        <ProjectsByStatusChart projects={projects} />

        {/* Projects by Methodology Chart */}
        <ProjectsByMethodologyChart projects={projects} />

        {/* Portfolio Health Gauge */}
        <PortfolioHealthGauge healthScore={stats.healthScore} />

        {/* Resource Utilization Chart */}
        <ResourceUtilizationChart 
          utilization={stats.resourceUtilization} 
          resourceData={[]}
        />

        {/* Budget Utilization Chart */}
        <BudgetUtilizationChart 
          utilized={metrics?.total_budget_spent || 0}
          allocated={portfolio.allocated_budget || 0}
          budgetData={[]}
        />

        {/* Risk Exposure Indicator */}
        <RiskExposureIndicator risks={risks} />
      </div>

      {/* Strategic Alignment & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Timeline View */}
        <TimelineView projects={projects} />

        {/* Strategic Alignment Score */}
        <StrategicAlignmentScore 
          objectives={[]} // TODO: Fetch portfolio objectives
          projects={projects}
        />
      </div>
    </div>
  );
}

