import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter } from 'lucide-react';
import { getQualityRegister, getQualityManagementStats } from '../../services/qualityManagementService';
import { supabase } from '../../services/supabaseClient';
import MetricCard from '../analytics/MetricCard';
import TrendChart from '../analytics/TrendChart';

export default function QualityReportBuilder({ projectId, dateRange = null }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    quality_status: '',
    product_type: '',
    quality_method: '',
  });

  useEffect(() => {
    generateReport();
  }, [projectId, filters, dateRange]);

  const generateReport = async () => {
    try {
      setLoading(true);
      
      const reportFilters = { project_id: projectId, ...filters };
      const [registerItems, stats] = await Promise.all([
        getQualityRegister(reportFilters),
        getQualityManagementStats(reportFilters),
      ]);

      // Generate quality trend data
      const trendData = generateTrendData(registerItems || []);

      setReportData({
        summary: stats,
        registerItems: registerItems || [],
        trends: trendData,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error generating quality report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (items) => {
    // Group by month
    const monthlyData = {};
    
    items.forEach(item => {
      const date = item.quality_review_actual_date || item.quality_review_planned_date || item.created_at;
      if (!date) return;
      
      const month = new Date(date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { date: month + '-01', passed: 0, failed: 0, total: 0 };
      }
      
      monthlyData[month].total++;
      if (item.quality_status === 'passed' || item.quality_status === 'approved') {
        monthlyData[month].passed++;
      } else if (item.quality_status === 'failed' || item.quality_status === 'rejected') {
        monthlyData[month].failed++;
      }
    });

    // Calculate pass rate
    return Object.values(monthlyData).map(data => ({
      date: data.date,
      value: data.total > 0 ? (data.passed / data.total) * 100 : 0,
      label: data.date,
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const handleExport = async (format = 'pdf') => {
    // Export functionality would be implemented here
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Report Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Unable to generate quality report
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              Quality Management Report
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generated: {new Date(reportData.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.quality_status || ''}
            onChange={(e) => setFilters({ ...filters, quality_status: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-review">In Review</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.product_type || ''}
            onChange={(e) => setFilters({ ...filters, product_type: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Types</option>
            <option value="document">Document</option>
            <option value="software">Software</option>
            <option value="hardware">Hardware</option>
            <option value="service">Service</option>
          </select>
          <select
            value={filters.quality_method || ''}
            onChange={(e) => setFilters({ ...filters, quality_method: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Methods</option>
            <option value="review">Review</option>
            <option value="inspection">Inspection</option>
            <option value="testing">Testing</option>
            <option value="approval">Approval</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      {reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Items"
            value={reportData.summary.totalRegisterItems || 0}
            displayFormat="number"
            status="neutral"
          />
          <MetricCard
            title="Average Quality Score"
            value={reportData.summary.averageQualityScore || 0}
            displayFormat="number"
            status={reportData.summary.averageQualityScore >= 90 ? 'good' : reportData.summary.averageQualityScore >= 70 ? 'warning' : 'critical'}
            targetValue={90}
          />
          <MetricCard
            title="Pass Rate"
            value={reportData.summary.totalRegisterItems > 0
              ? (reportData.summary.passedItems / reportData.summary.totalRegisterItems) * 100
              : 0}
            displayFormat="percentage"
            status={reportData.summary.totalRegisterItems > 0 && (reportData.summary.passedItems / reportData.summary.totalRegisterItems) >= 0.9 ? 'good' : 'warning'}
            targetValue={90}
          />
          <MetricCard
            title="Open Defects"
            value={reportData.summary.openDefects || 0}
            displayFormat="number"
            status={reportData.summary.openDefects === 0 ? 'good' : reportData.summary.openDefects < 10 ? 'warning' : 'critical'}
            targetValue={0}
          />
        </div>
      )}

      {/* Quality Trend */}
      {reportData.trends && reportData.trends.length > 0 && (
        <TrendChart
          title="Quality Pass Rate Trend"
          data={reportData.trends}
          height={300}
          color="#8B5CF6"
          formatValue={(val) => `${val.toFixed(1)}%`}
          formatDate={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        />
      )}

      {/* Register Items Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quality Register Items ({reportData.registerItems.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {reportData.registerItems.filter(item => item.quality_status === 'passed' || item.quality_status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Passed/Approved</div>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {reportData.registerItems.filter(item => item.quality_status === 'pending' || item.quality_status === 'in-review').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending/In Review</div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {reportData.registerItems.filter(item => item.quality_status === 'failed' || item.quality_status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Failed/Rejected</div>
          </div>
        </div>
      </div>
    </div>
  );
}

