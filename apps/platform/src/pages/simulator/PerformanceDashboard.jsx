import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Activity, Shield, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { getPerformanceSummary, checkPerformanceThresholds, getMemoryUsage } from '../../services/performanceService';
import { checkAccessibility } from '../../services/securityService';

const PerformanceDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [accessibility, setAccessibility] = useState(null);
  const [thresholds, setThresholds] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    try {
      const perfSummary = getPerformanceSummary();
      const memUsage = getMemoryUsage();
      const accessCheck = checkAccessibility();
      const thresholdCheck = checkPerformanceThresholds();

      setPerformanceData(perfSummary);
      setMemoryUsage(memUsage);
      setAccessibility(accessCheck);
      setThresholds(thresholdCheck);
      setLoading(false);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Performance & Security Dashboard</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Monitor system performance, security, and compliance
        </p>
      </div>

      {/* Performance Status */}
      {thresholds && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Performance Status</h2>
            {thresholds.acceptable ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
          </div>
          {thresholds.acceptable ? (
            <p className="text-green-600 dark:text-green-400">All performance metrics are within acceptable thresholds</p>
          ) : (
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 mb-2">Performance issues detected:</p>
              <ul className="list-disc list-inside space-y-1">
                {thresholds.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Performance Metrics */}
      {performanceData && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Page Load Time
              </p>
              <p className="text-2xl font-bold">{Math.round(performanceData.pageLoad || 0)}ms</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                First Contentful Paint
              </p>
              <p className="text-2xl font-bold">{Math.round(performanceData.firstContentfulPaint || 0)}ms</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Time to Interactive
              </p>
              <p className="text-2xl font-bold">{Math.round(performanceData.timeToInteractive || 0)}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Memory Usage */}
      {memoryUsage && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-xl font-bold mb-4">Memory Usage</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {(memoryUsage.used / 1024 / 1024).toFixed(2)} MB</span>
              <span>Limit: {(memoryUsage.limit / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  memoryUsage.percentage > 80 ? 'bg-red-500' : memoryUsage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(memoryUsage.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{memoryUsage.percentage.toFixed(1)}% used</p>
          </div>
        </div>
      )}

      {/* Accessibility */}
      {accessibility && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Accessibility</h2>
            {accessibility.compliant ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
          </div>
          {accessibility.compliant ? (
            <p className="text-green-600 dark:text-green-400">No accessibility issues detected</p>
          ) : (
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 mb-2">Accessibility issues found:</p>
              <ul className="list-disc list-inside space-y-1">
                {accessibility.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;

