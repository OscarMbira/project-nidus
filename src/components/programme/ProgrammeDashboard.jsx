import { useState, useEffect } from 'react';
import { Target, Users, TrendingUp, AlertTriangle, DollarSign, Calendar, Activity, CheckCircle } from 'lucide-react';
import { getProgrammeDashboardStats, getProgrammeProjects, getProgrammeBenefits, getProgrammeDependencies, getProgrammeMilestones } from '../../services/programmeService';
import ProgrammeProgressChart from './ProgrammeProgressChart';
import RelatedProjectsStatus from './RelatedProjectsStatus';
import BenefitsRealizationChart from './BenefitsRealizationChart';
import DependencyMapVisualization from './DependencyMapVisualization';
import ProgrammeTimelineView from './ProgrammeTimelineView';
import ResourceCoordinationView from './ResourceCoordinationView';
import ProgrammeRiskIndicator from './ProgrammeRiskIndicator';
import ProgrammeMilestoneTracker from './ProgrammeMilestoneTracker';

export default function ProgrammeDashboard({ programmeId }) {
  const [stats, setStats] = useState(null);
  const [programme, setProgramme] = useState(null);
  const [projects, setProjects] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (programmeId) {
      loadDashboardData();
    }
  }, [programmeId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, projectsData, benefitsData, dependenciesData, milestonesData] = await Promise.all([
        getProgrammeDashboardStats(programmeId),
        getProgrammeProjects(programmeId),
        getProgrammeBenefits(programmeId),
        getProgrammeDependencies(programmeId),
        getProgrammeMilestones(programmeId),
      ]);
      setStats(statsData);
      setProgramme(statsData?.programme);
      setProjects(projectsData || []);
      setBenefits(benefitsData || []);
      setDependencies(dependenciesData || []);
      setMilestones(milestonesData || []);
    } catch (err) {
      console.error('Error loading programme dashboard:', err);
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

  if (!stats || !stats.programme) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.stats.totalProjects,
      subtitle: `${stats.stats.activeProjects} active, ${stats.stats.completedProjects} completed`,
      icon: Target,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Programme Progress',
      value: `${Math.round(stats.stats.progressPercentage)}%`,
      subtitle: `${stats.stats.completedProjects} of ${stats.stats.totalProjects} projects completed`,
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Health Score',
      value: `${Math.round(stats.stats.healthScore)}%`,
      subtitle: stats.stats.healthScore >= 80 ? 'Healthy' : stats.stats.healthScore >= 60 ? 'At Risk' : 'Critical',
      icon: Activity,
      color: stats.stats.healthScore >= 80 ? 'green' : stats.stats.healthScore >= 60 ? 'yellow' : 'red',
      bgColor: stats.stats.healthScore >= 80 
        ? 'bg-green-50 dark:bg-green-900/20' 
        : stats.stats.healthScore >= 60 
        ? 'bg-yellow-50 dark:bg-yellow-900/20' 
        : 'bg-red-50 dark:bg-red-900/20',
      iconColor: stats.stats.healthScore >= 80 
        ? 'text-green-600 dark:text-green-400' 
        : stats.stats.healthScore >= 60 
        ? 'text-yellow-600 dark:text-yellow-400' 
        : 'text-red-600 dark:text-red-400',
      borderColor: stats.stats.healthScore >= 80 
        ? 'border-green-200 dark:border-green-800' 
        : stats.stats.healthScore >= 60 
        ? 'border-yellow-200 dark:border-yellow-800' 
        : 'border-red-200 dark:border-red-800'
    },
    {
      title: 'Benefits Realization',
      value: `${Math.round(stats.stats.benefitsRealization)}%`,
      subtitle: `${stats.stats.realizedBenefits} of ${stats.stats.totalBenefits} benefits realized`,
      icon: CheckCircle,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Milestones',
      value: `${stats.stats.completedMilestones}/${stats.stats.totalMilestones}`,
      subtitle: `${stats.stats.atRiskMilestones} at risk`,
      icon: Calendar,
      color: stats.stats.atRiskMilestones > 0 ? 'orange' : 'blue',
      bgColor: stats.stats.atRiskMilestones > 0 
        ? 'bg-orange-50 dark:bg-orange-900/20' 
        : 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: stats.stats.atRiskMilestones > 0 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-blue-600 dark:text-blue-400',
      borderColor: stats.stats.atRiskMilestones > 0 
        ? 'border-orange-200 dark:border-orange-800' 
        : 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Dependencies',
      value: stats.stats.totalDependencies,
      subtitle: `${stats.stats.criticalDependencies} critical, ${stats.stats.activeDependencies} active`,
      icon: AlertTriangle,
      color: stats.stats.criticalDependencies > 0 ? 'red' : 'gray',
      bgColor: stats.stats.criticalDependencies > 0 
        ? 'bg-red-50 dark:bg-red-900/20' 
        : 'bg-gray-50 dark:bg-gray-800',
      iconColor: stats.stats.criticalDependencies > 0 
        ? 'text-red-600 dark:text-red-400' 
        : 'text-gray-600 dark:text-gray-400',
      borderColor: stats.stats.criticalDependencies > 0 
        ? 'border-red-200 dark:border-red-800' 
        : 'border-gray-200 dark:border-gray-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-lg border ${stat.borderColor} p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </p>
              {stat.subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Projects Overview */}
      {stats.projects && stats.projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Projects Overview
          </h3>
          <div className="space-y-3">
            {stats.projects.slice(0, 5).map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {proj.project?.project_name || 'Unknown Project'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {proj.project?.project_code || ''} • {proj.project?.project_status || 'unknown'}
                  </p>
                </div>
                {proj.programme_priority && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    proj.programme_priority === 'critical' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : proj.programme_priority === 'high'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {proj.programme_priority}
                  </span>
                )}
              </div>
            ))}
            {stats.projects.length > 5 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                + {stats.projects.length - 5} more projects
              </p>
            )}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {stats.stats.criticalDependencies > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              {stats.stats.criticalDependencies} critical dependencies require attention
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Programme Progress Chart */}
        <ProgrammeProgressChart 
          progress={stats.stats.progressPercentage} 
          projects={projects} 
        />

        {/* Related Projects Status */}
        <RelatedProjectsStatus projects={projects} />

        {/* Benefits Realization Chart */}
        <BenefitsRealizationChart benefits={benefits} />

        {/* Dependency Map Visualization */}
        <DependencyMapVisualization dependencies={dependencies} />

        {/* Programme Risk Indicator */}
        <ProgrammeRiskIndicator 
          risks={[]} // TODO: Fetch programme risks
          dependencies={dependencies} 
        />

        {/* Programme Milestone Tracker */}
        <ProgrammeMilestoneTracker milestones={milestones} />
      </div>

      {/* Timeline & Resource Coordination */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Programme Timeline View */}
        <ProgrammeTimelineView 
          programme={programme}
          milestones={milestones}
          projects={projects}
        />

        {/* Resource Coordination View */}
        <ResourceCoordinationView 
          projects={projects}
          resourceAllocations={[]} // TODO: Fetch cross-project resource allocations
        />
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Refresh Dashboard
        </button>
      </div>
    </div>
  );
}

