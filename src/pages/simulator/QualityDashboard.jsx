import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  analyzeEventQuality, 
  analyzeDifficultyCalibration, 
  generateQualityReport 
} from '../../utils/eventQualityAnalyzer';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

const QualityDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [timeRange, setTimeRange] = useState('30 days');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadReport();
  }, [timeRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await generateQualityReport(timeRange);
      if (result.success) {
        setReport(result.report);
      } else {
        console.error('Failed to generate report:', result.error);
      }
    } catch (error) {
      console.error('Error loading quality report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading quality report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">No quality data available. Run some simulations first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className={`rounded-xl p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Quality Dashboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              AI Event Quality & Difficulty Calibration Analysis
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-gray-200' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="7 days">Last 7 days</option>
            <option value="30 days">Last 30 days</option>
            <option value="90 days">Last 90 days</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b">
          {['overview', 'quality', 'calibration', 'issues'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Total Events"
            value={report.quality.totalEvents}
            subtitle={`${report.quality.aiGenerated} AI-generated`}
            icon={BarChart3}
            theme={theme}
          />
          <MetricCard
            title="Average Score"
            value={`${report.quality.averageScore.toFixed(1)}%`}
            subtitle="Across all events"
            icon={TrendingUp}
            theme={theme}
            color={report.quality.averageScore >= 70 ? 'green' : 'yellow'}
          />
          <MetricCard
            title="Optimal Rate"
            value={`${report.quality.optimalRate.toFixed(1)}%`}
            subtitle="Optimal responses"
            icon={CheckCircle}
            theme={theme}
            color={report.quality.optimalRate >= 50 ? 'green' : 'yellow'}
          />
          <MetricCard
            title="Issues Found"
            value={report.issues.length}
            subtitle="Need calibration"
            icon={AlertTriangle}
            theme={theme}
            color={report.issues.length === 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h2 className="text-xl font-bold mb-4">Quality by Category</h2>
            <div className="space-y-4">
              {report.quality.byCategory.map(cat => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="capitalize">{cat.category}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{cat.count} events</span>
                    <span className={`font-medium ${
                      cat.averageScore >= 70 ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {cat.averageScore.toFixed(1)}% avg
                    </span>
                    <span className="text-sm text-gray-500">
                      {cat.optimalRate.toFixed(1)}% optimal
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h2 className="text-xl font-bold mb-4">Quality by Difficulty</h2>
            <div className="space-y-4">
              {report.quality.byDifficulty.map(diff => (
                <div key={diff.difficulty} className="flex items-center justify-between">
                  <span className="capitalize">{diff.difficulty}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{diff.count} events</span>
                    <span className={`font-medium ${
                      diff.averageScore >= 70 ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {diff.averageScore.toFixed(1)}% avg
                    </span>
                    <span className="text-sm text-gray-500">
                      {diff.optimalRate.toFixed(1)}% optimal
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calibration Tab */}
      {activeTab === 'calibration' && (
        <div className="space-y-6">
          {Object.entries(report.calibration).map(([difficulty, data]) => (
            <div key={difficulty} className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold capitalize">{difficulty} Difficulty</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  data.calibration === 'well_calibrated' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : data.calibration === 'too_easy'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {data.calibration.replace('_', ' ')}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Average Score</div>
                  <div className={`text-2xl font-bold ${
                    Math.abs(data.averageScore - data.targetScore) <= 5 
                      ? 'text-green-500' 
                      : 'text-yellow-500'
                  }`}>
                    {data.averageScore.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">Target: {data.targetScore}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Optimal Rate</div>
                  <div className="text-2xl font-bold">{data.optimalRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">Target: {data.targetOptimalRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Runs</div>
                  <div className="text-2xl font-bold">{data.totalRuns}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Time</div>
                  <div className="text-2xl font-bold">{data.averageTime.toFixed(0)}m</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h2 className="text-xl font-bold mb-4">Events Needing Calibration</h2>
            {report.issues.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No calibration issues found! 🎉</p>
            ) : (
              <div className="space-y-4">
                {report.issues.map((issue, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{issue.eventType}</span>
                      <span className="text-sm text-gray-500">{issue.category}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Occurrences:</span>
                        <span className="ml-2 font-medium">{issue.occurrences}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Score:</span>
                        <span className={`ml-2 font-medium ${
                          issue.averageScore < 50 ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          {issue.averageScore.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Optimal Rate:</span>
                        <span className={`ml-2 font-medium ${
                          issue.optimalRate < 30 ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          {issue.optimalRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h2 className="text-xl font-bold mb-4">Recommendations</h2>
            <div className="space-y-3">
              {report.recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  rec.priority === 'high' 
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${
                      rec.priority === 'high' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <div className="font-medium mb-1">{rec.message}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {rec.category} • {rec.priority} priority
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon, theme, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    yellow: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {subtitle}
      </div>
    </div>
  );
};

export default QualityDashboard;

