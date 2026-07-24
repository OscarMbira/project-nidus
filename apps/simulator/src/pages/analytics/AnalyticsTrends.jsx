import { useState, useEffect } from 'react';
import { TrendingUp, Filter, Calendar } from 'lucide-react';
import TrendChart from '../../components/analytics/TrendChart';
import VarianceAnalysis from '../../components/analytics/VarianceAnalysis';
import { getKPIActuals } from '../../services/kpiService';
import { getAnalyticsSnapshots } from '../../services/analyticsService';
import { supabase } from '../../services/supabaseClient';

export default function AnalyticsTrends() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [projects, setProjects] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [varianceData, setVarianceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchProjects();
    fetchKPIs();
  }, []);

  useEffect(() => {
    if (selectedKpiId || selectedProjectId) {
      fetchTrendData();
    }
  }, [selectedKpiId, selectedProjectId, dateRange]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchKPIs = async () => {
    try {
      const { data } = await supabase
        .from('kpi_definitions')
        .select('id, kpi_name, kpi_code, kpi_category')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('kpi_name', { ascending: true });

      if (data) setKpis(data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const fetchTrendData = async () => {
    try {
      setLoading(true);

      if (selectedKpiId) {
        // Fetch KPI actuals for trend
        const filters = {
          kpi_definition_id: selectedKpiId,
          measurement_date_start: dateRange.start,
          measurement_date_end: dateRange.end,
        };
        if (selectedProjectId) filters.project_id = selectedProjectId;

        const actuals = await getKPIActuals(filters);

        const trend = (actuals || []).map(actual => ({
          date: actual.measurement_date,
          value: parseFloat(actual.actual_value) || 0,
          label: actual.measurement_date,
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        setTrendData(trend);
      } else if (selectedProjectId) {
        // Fetch analytics snapshots for project trends
        const filters = {
          project_id: selectedProjectId,
        };

        const snapshots = await getAnalyticsSnapshots(filters);

        const trend = (snapshots || []).map(snapshot => ({
          date: snapshot.snapshot_date || snapshot.created_at?.split('T')[0],
          value: snapshot.completion_percentage || 0,
          label: snapshot.snapshot_date || snapshot.created_at?.split('T')[0],
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        setTrendData(trend);

        // Generate variance data points
        const variancePoints = generateVarianceDataPoints(snapshots);
        setVarianceData(variancePoints);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateVarianceDataPoints = (snapshots) => {
    if (!snapshots || snapshots.length < 2) return [];

    return snapshots.map((snapshot, index) => ({
      period: snapshot.snapshot_date || snapshot.created_at?.split('T')[0] || `Period ${index + 1}`,
      plannedDuration: snapshot.planned_duration || 0,
      actualDuration: snapshot.actual_duration || 0,
      plannedCost: snapshot.planned_cost || 0,
      actualCost: snapshot.actual_cost || 0,
      plannedDeliverables: snapshot.planned_deliverables || 0,
      actualDeliverables: snapshot.actual_deliverables || 0,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Trend Analysis
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyze trends and variances over time
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                if (e.target.value) setSelectedKpiId('');
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              KPI (optional)
            </label>
            <select
              value={selectedKpiId}
              onChange={(e) => {
                setSelectedKpiId(e.target.value);
                if (e.target.value) setSelectedProjectId('');
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select KPI...</option>
              {kpis.map(kpi => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.kpi_name} ({kpi.kpi_category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : trendData.length > 0 ? (
        <div className="mb-6">
          <TrendChart
            title={selectedKpiId 
              ? `${kpis.find(k => k.id === selectedKpiId)?.kpi_name || 'KPI'} Trend`
              : selectedProjectId
              ? `Project Performance Trend`
              : 'Trend Analysis'}
            data={trendData}
            height={400}
            color="#3B82F6"
            formatValue={(val) => val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            formatDate={(date) => new Date(date).toLocaleDateString()}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center mb-6">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Trend Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select a project or KPI and date range to view trends
          </p>
        </div>
      )}

      {/* Variance Analysis */}
      {selectedProjectId && varianceData.length > 0 && (
        <VarianceAnalysis projectId={selectedProjectId} dataPoints={varianceData} />
      )}
    </div>
  );
}

