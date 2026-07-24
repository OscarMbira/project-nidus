import { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { getKPIDefinitions, getKPIPerformanceSummary, getKPIAlerts } from '../../services/kpiService';
import MetricCard from './MetricCard';
import TrendChart from './TrendChart';
import { getKPIActuals } from '../../services/kpiService';

export default function KPITracker({ projectId = null, category = null, limit = null }) {
  const [kpis, setKpis] = useState([]);
  const [performanceSummary, setPerformanceSummary] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpiTrends, setKpiTrends] = useState({});

  useEffect(() => {
    fetchData();
  }, [projectId, category]);

  useEffect(() => {
    if (selectedKpi) {
      fetchKPITrend(selectedKpi.id);
    }
  }, [selectedKpi]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (projectId) filters.project_id = projectId;
      if (category) filters.kpi_category = category;

      const [kpisData, summaryData, alertsData] = await Promise.all([
        getKPIDefinitions({ ...filters, is_active: true }),
        getKPIPerformanceSummary(filters),
        getKPIAlerts({ ...filters, is_acknowledged: false }),
      ]);

      setKpis(limit ? kpisData.slice(0, limit) : kpisData);
      setPerformanceSummary(summaryData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      alert('Error loading KPI tracker: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPITrend = async (kpiId) => {
    try {
      const filters = { kpi_definition_id: kpiId };
      if (projectId) filters.project_id = projectId;

      // Get last 12 measurements
      const actuals = await getKPIActuals({
        ...filters,
        measurement_date_end: new Date().toISOString().split('T')[0],
      });

      // Sort by date and take last 12
      const sorted = (actuals || []).sort((a, b) => 
        new Date(a.measurement_date) - new Date(b.measurement_date)
      ).slice(-12);

      setKpiTrends(prev => ({
        ...prev,
        [kpiId]: sorted.map(a => ({
          date: a.measurement_date,
          value: parseFloat(a.actual_value),
          label: a.measurement_date,
        })),
      }));
    } catch (error) {
      console.error('Error fetching KPI trend:', error);
    }
  };

  const getPerformanceStatus = (kpi) => {
    const summary = performanceSummary.find(s => s.kpi_id === kpi.id);
    if (!summary) return 'neutral';

    switch (summary.performance_status) {
      case 'on-target':
        return 'good';
      case 'below-target':
        return 'warning';
      case 'critical':
        return 'critical';
      default:
        return 'neutral';
    }
  };

  const getKPIDisplayFormat = (kpi) => {
    return {
      displayFormat: kpi.display_format || 'number',
      decimalPlaces: kpi.decimal_places || 2,
      prefix: kpi.prefix || '',
      suffix: kpi.suffix || '',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No KPIs Available
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {category ? `No KPIs found in category "${category}"` : 'Create KPIs to start tracking performance'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-300">
              Active KPI Alerts ({alerts.length})
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="text-sm text-red-800 dark:text-red-300">
                <strong>{alert.kpi?.kpi_name}:</strong> {alert.alert_message || alert.alert_description}
              </div>
            ))}
            {alerts.length > 5 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                + {alerts.length - 5} more alerts
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => {
          const summary = performanceSummary.find(s => s.kpi_id === kpi.id);
          const trend = kpiTrends[kpi.id] || [];
          const latestValue = trend.length > 0 ? trend[trend.length - 1].value : summary?.latest_actual;
          const previousValue = trend.length > 1 ? trend[trend.length - 2].value : null;
          const trendPercentage = previousValue && previousValue !== 0
            ? ((latestValue - previousValue) / previousValue) * 100
            : null;

          return (
            <div key={kpi.id}>
              <MetricCard
                title={kpi.kpi_name}
                value={latestValue || summary?.latest_actual || null}
                targetValue={summary?.current_target || null}
                status={getPerformanceStatus(kpi)}
                trend={trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable'}
                trendPercentage={trendPercentage}
                onClick={() => setSelectedKpi(selectedKpi?.id === kpi.id ? null : kpi)}
                {...getKPIDisplayFormat(kpi)}
              />
            </div>
          );
        })}
      </div>

      {/* Selected KPI Detail View */}
      {selectedKpi && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedKpi.kpi_name}
              </h3>
              {selectedKpi.kpi_description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedKpi.kpi_description}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedKpi(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {kpiTrends[selectedKpi.id] && kpiTrends[selectedKpi.id].length > 0 ? (
            <TrendChart
              title={`${selectedKpi.kpi_name} Trend`}
              data={kpiTrends[selectedKpi.id]}
              color={selectedKpi.chart_color || '#3B82F6'}
              formatValue={(val) => {
                const format = getKPIDisplayFormat(selectedKpi);
                if (format.displayFormat === 'percentage') {
                  return `${val.toFixed(format.decimalPlaces)}%`;
                } else if (format.displayFormat === 'currency') {
                  return `${format.prefix || '$'}${val.toLocaleString(undefined, { minimumFractionDigits: format.decimalPlaces, maximumFractionDigits: format.decimalPlaces })}`;
                } else {
                  return `${format.prefix}${val.toLocaleString(undefined, { minimumFractionDigits: format.decimalPlaces, maximumFractionDigits: format.decimalPlaces })}${format.suffix}`;
                }
              }}
              formatDate={(date) => new Date(date).toLocaleDateString()}
            />
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No trend data available for this KPI
            </div>
          )}

          {/* KPI Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Category</div>
              <div className="font-semibold text-gray-900 dark:text-white capitalize">
                {selectedKpi.kpi_category || 'N/A'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Measurement Unit</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {selectedKpi.measurement_unit || 'N/A'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Frequency</div>
              <div className="font-semibold text-gray-900 dark:text-white capitalize">
                {selectedKpi.measurement_frequency || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

