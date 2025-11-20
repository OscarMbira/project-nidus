import { useState, useEffect } from 'react';
import { Eye, RefreshCw, Download, FileText, AlertCircle } from 'lucide-react';
import { generateReportData } from '../../services/reportBuilderService';
import TrendChart from '../analytics/TrendChart';

export default function ReportPreview({ reportDefinition, data = null, onRefresh, className = '' }) {
  const [reportData, setReportData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data && reportDefinition) {
      loadReportData();
    } else {
      setReportData(data);
    }
  }, [reportDefinition, data]);

  const loadReportData = async () => {
    if (!reportDefinition) return;

    try {
      setLoading(true);
      setError(null);
      const data = await generateReportData(reportDefinition);
      setReportData(data);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  if (!reportDefinition) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center ${className}`}>
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Report Selected
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Configure your report to see a preview
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center ${className}`}>
        <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading report data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Error Loading Report</h3>
        </div>
        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={loadReportData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const renderReportContent = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No data available for this report
        </div>
      );
    }

    const chartType = reportDefinition.chart_type || 'table';

    switch (chartType) {
      case 'table':
        return renderTable();
      case 'bar':
      case 'line':
      case 'area':
        return renderChart(chartType);
      case 'pie':
        return renderPieChart();
      default:
        return renderTable();
    }
  };

  const renderTable = () => {
    if (!reportData || reportData.length === 0) return null;

    // Get column names from first row
    const columns = Object.keys(reportData[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {reportData.slice(0, 100).map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {reportData.length > 100 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
            Showing first 100 of {reportData.length} rows
          </div>
        )}
      </div>
    );
  };

  const renderChart = (type) => {
    // Prepare data for chart
    // This is a simplified version - would need proper data transformation
    const chartData = reportData.slice(0, 20).map((row, index) => ({
      date: row.date || row.created_at || `Item ${index + 1}`,
      value: parseFloat(row.value || row.amount || row.count || index) || 0,
      label: row.label || row.name || `Item ${index + 1}`,
    }));

    if (chartData.length === 0) return renderTable();

    return (
      <TrendChart
        title={reportDefinition.report_name || 'Report Chart'}
        data={chartData}
        height={300}
        color="#3B82F6"
      />
    );
  };

  const renderPieChart = () => {
    // Simplified pie chart - would need proper implementation
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Pie chart visualization coming soon
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Report Preview
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadReportData}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {reportData && reportData.length > 0 && (
            <button
              onClick={() => onRefresh && onRefresh()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {renderReportContent()}
      </div>
    </div>
  );
}

