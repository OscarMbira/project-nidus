import { useState, useEffect } from 'react';
import { Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getProjectAnalyticsSummary } from '../../services/analyticsService';
import { calculateProjectHealthScore } from '../../services/metricsCalculator';
import MetricCard from './MetricCard';
import TrendChart from './TrendChart';

export default function ProjectHealthDashboard({ projectId }) {
  const [projectSummary, setProjectSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthHistory, setHealthHistory] = useState([]);

  useEffect(() => {
    if (projectId) {
      fetchProjectHealth();
    }
  }, [projectId]);

  const fetchProjectHealth = async () => {
    try {
      setLoading(true);
      const summary = await getProjectAnalyticsSummary(projectId);
      setProjectSummary(summary);

      // Mock health history (in real implementation, fetch from analytics snapshots)
      const history = generateHealthHistory(summary);
      setHealthHistory(history);
    } catch (error) {
      console.error('Error fetching project health:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHealthHistory = (summary) => {
    if (!summary) return [];
    
    const history = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7)); // Weekly snapshots
      
      history.push({
        date: date.toISOString().split('T')[0],
        value: calculateHealthValue(summary, i),
        label: date.toLocaleDateString(),
      });
    }
    
    return history;
  };

  const calculateHealthValue = (summary, weeksAgo) => {
    // Simulate health progression
    const baseHealth = summary.completion_percentage || 0;
    const variation = (5 - weeksAgo) * 2; // Gradual improvement
    return Math.min(Math.max(baseHealth - variation, 0), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!projectSummary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Project Health Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Project health metrics will appear here
        </p>
      </div>
    );
  }

  const healthScore = calculateProjectHealthScore({
    schedulePerformance: projectSummary.schedule_performance ? projectSummary.schedule_performance / 100 : null,
    costPerformance: projectSummary.budget_utilization ? (100 - projectSummary.budget_utilization) / 100 : null,
    qualityScore: projectSummary.quality_score,
    riskScore: projectSummary.risk_score ? projectSummary.risk_score / 100 : null,
  });

  const getHealthStatus = (score) => {
    if (score >= 80) return { status: 'good', label: 'Healthy', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { status: 'warning', label: 'At Risk', color: 'text-yellow-600 dark:text-yellow-400' };
    return { status: 'critical', label: 'Critical', color: 'text-red-600 dark:text-red-400' };
  };

  const healthStatus = getHealthStatus(healthScore);

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className={`h-5 w-5 ${healthStatus.color}`} />
            Overall Project Health
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            healthStatus.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            healthStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {healthStatus.label}
          </span>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className={`text-5xl font-bold ${healthStatus.color} mb-2`}>
              {healthScore}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Health Score (0-100)
            </div>
          </div>

          {/* Health Gauge Visualization */}
          <div className="w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
                className="dark:stroke-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={
                  healthStatus.status === 'good' ? '#10b981' :
                  healthStatus.status === 'warning' ? '#f59e0b' :
                  '#ef4444'
                }
                strokeWidth="8"
                strokeDasharray={`${(healthScore / 100) * 351.86} 351.86`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Completion"
          value={projectSummary.completion_percentage || 0}
          displayFormat="percentage"
          status={projectSummary.completion_percentage >= 90 ? 'good' : projectSummary.completion_percentage >= 70 ? 'warning' : 'critical'}
          targetValue={100}
        />
        <MetricCard
          title="Budget Utilization"
          value={projectSummary.budget_utilization || 0}
          displayFormat="percentage"
          status={projectSummary.budget_utilization <= 100 ? 'good' : projectSummary.budget_utilization <= 110 ? 'warning' : 'critical'}
          targetValue={100}
        />
        <MetricCard
          title="Schedule Performance"
          value={(projectSummary.schedule_performance || 0) * 100}
          displayFormat="percentage"
          status={projectSummary.schedule_performance >= 0.95 ? 'good' : projectSummary.schedule_performance >= 0.85 ? 'warning' : 'critical'}
          targetValue={100}
        />
        <MetricCard
          title="Quality Score"
          value={projectSummary.quality_score || 0}
          displayFormat="number"
          status={projectSummary.quality_score >= 90 ? 'good' : projectSummary.quality_score >= 70 ? 'warning' : 'critical'}
          targetValue={90}
        />
      </div>

      {/* Health Trend */}
      {healthHistory.length > 0 && (
        <TrendChart
          title="Project Health Trend"
          data={healthHistory}
          height={250}
          color={
            healthStatus.status === 'good' ? '#10b981' :
            healthStatus.status === 'warning' ? '#f59e0b' :
            '#ef4444'
          }
          formatValue={(val) => `${val.toFixed(0)}`}
          formatDate={(date) => new Date(date).toLocaleDateString()}
        />
      )}

      {/* Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className={`h-5 w-5 ${
              projectSummary.completion_percentage >= 90 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
            }`} />
            <h4 className="font-medium text-gray-900 dark:text-white">Schedule Status</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {projectSummary.schedule_performance >= 0.95 ? 'On Track' :
             projectSummary.schedule_performance >= 0.85 ? 'Slightly Behind' :
             'Behind Schedule'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`h-5 w-5 ${
              projectSummary.budget_utilization <= 100 ? 'text-green-600 dark:text-green-400' :
              projectSummary.budget_utilization <= 110 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`} />
            <h4 className="font-medium text-gray-900 dark:text-white">Budget Status</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {projectSummary.budget_utilization <= 100 ? 'Within Budget' :
             projectSummary.budget_utilization <= 110 ? 'Slightly Over' :
             'Over Budget'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-5 w-5 ${
              projectSummary.risk_score < 0.3 ? 'text-green-600 dark:text-green-400' :
              projectSummary.risk_score < 0.6 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`} />
            <h4 className="font-medium text-gray-900 dark:text-white">Risk Level</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {projectSummary.risk_score < 0.3 ? 'Low Risk' :
             projectSummary.risk_score < 0.6 ? 'Moderate Risk' :
             'High Risk'}
          </p>
        </div>
      </div>
    </div>
  );
}

