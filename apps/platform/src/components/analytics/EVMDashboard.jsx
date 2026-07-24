import { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import {
  calculateSPI,
  calculateCPI,
  calculateSV,
  calculateCV,
  calculateEAC,
  calculateETC,
  calculateVAC,
  calculateTCPI,
  calculateEarnedValue,
  calculatePlannedValue,
} from '../../services/metricsCalculator';
import MetricCard from './MetricCard';
import TrendChart from './TrendChart';

export default function EVMDashboard({ projectId }) {
  const [evmData, setEvmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (projectId) {
      fetchEVData();
    }
  }, [projectId]);

  const fetchEVData = async () => {
    try {
      setLoading(true);
      // Fetch project data and calculate EVM metrics
      // This is a simplified version - in real implementation, fetch actual project data
      const projectData = await fetchProjectData(projectId);
      const evm = calculateEVMMetrics(projectData);
      setEvmData(evm);

      // Generate history
      const historyData = generateHistory(evm);
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching EVM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectData = async (projectId) => {
    // Placeholder - in real implementation, fetch from projects table
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    return data;
  };

  const calculateEVMMetrics = (project) => {
    if (!project) return null;

    const today = new Date();
    const startDate = project.start_date ? new Date(project.start_date) : today;
    const endDate = project.end_date ? new Date(project.end_date) : today;
    const budget = parseFloat(project.budget || 0);
    const actualCost = parseFloat(project.actual_cost || 0);
    const completion = parseFloat(project.completion_percentage || 0);

    // Calculate EVM metrics
    const earnedValue = calculateEarnedValue(completion, budget);
    const plannedValue = calculatePlannedValue(
      startDate.toISOString(),
      endDate.toISOString(),
      today.toISOString(),
      budget
    );

    const spi = calculateSPI(earnedValue, plannedValue);
    const cpi = calculateCPI(earnedValue, actualCost);
    const sv = calculateSV(earnedValue, plannedValue);
    const cv = calculateCV(earnedValue, actualCost);
    const eac = calculateEAC(budget, cpi);
    const etc = calculateETC(eac, actualCost);
    const vac = calculateVAC(budget, eac);
    const tcpi = calculateTCPI(budget, earnedValue, actualCost);

    return {
      budget,
      actualCost,
      earnedValue,
      plannedValue,
      completion,
      spi,
      cpi,
      sv,
      cv,
      eac,
      etc,
      vac,
      tcpi,
      startDate,
      endDate,
      today,
    };
  };

  const generateHistory = (evm) => {
    if (!evm) return [];

    const history = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7)); // Weekly snapshots
      
      // Simulate progression
      const weeksAgo = i;
      const progressFactor = 1 - (weeksAgo * 0.05);
      
      history.push({
        date: date.toISOString().split('T')[0],
        value: evm.earnedValue * progressFactor,
        label: date.toLocaleDateString(),
      });
    }
    
    return history;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!evmData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No EVM Data Available
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Earned Value Management metrics require project budget and cost data
        </p>
      </div>
    );
  }

  const spiStatus = evmData.spi >= 1 ? 'good' : evmData.spi >= 0.9 ? 'warning' : 'critical';
  const cpiStatus = evmData.cpi >= 1 ? 'good' : evmData.cpi >= 0.9 ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      {/* Key EVM Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Earned Value (EV)"
          value={evmData.earnedValue}
          displayFormat="currency"
          status={evmData.earnedValue >= evmData.plannedValue ? 'good' : 'warning'}
          targetValue={evmData.plannedValue}
        />
        <MetricCard
          title="Planned Value (PV)"
          value={evmData.plannedValue}
          displayFormat="currency"
          status="neutral"
        />
        <MetricCard
          title="Actual Cost (AC)"
          value={evmData.actualCost}
          displayFormat="currency"
          status={evmData.actualCost <= evmData.budget ? 'good' : evmData.actualCost <= evmData.budget * 1.1 ? 'warning' : 'critical'}
          targetValue={evmData.budget}
        />
        <MetricCard
          title="Budget at Completion (BAC)"
          value={evmData.budget}
          displayFormat="currency"
          status="neutral"
        />
      </div>

      {/* Performance Indexes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Schedule Performance Index (SPI)
            </h3>
            <span className={`text-2xl font-bold ${
              spiStatus === 'good' ? 'text-green-600 dark:text-green-400' :
              spiStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {evmData.spi !== null ? evmData.spi.toFixed(2) : 'N/A'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {evmData.spi >= 1 ? 'Ahead of Schedule' :
               evmData.spi >= 0.9 ? 'Slightly Behind Schedule' :
               'Behind Schedule'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  spiStatus === 'good' ? 'bg-green-600' :
                  spiStatus === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${Math.min((evmData.spi || 0) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              Cost Performance Index (CPI)
            </h3>
            <span className={`text-2xl font-bold ${
              cpiStatus === 'good' ? 'text-green-600 dark:text-green-400' :
              cpiStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {evmData.cpi !== null ? evmData.cpi.toFixed(2) : 'N/A'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {evmData.cpi >= 1 ? 'Under Budget' :
               evmData.cpi >= 0.9 ? 'Slightly Over Budget' :
               'Over Budget'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  cpiStatus === 'good' ? 'bg-green-600' :
                  cpiStatus === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${Math.min((evmData.cpi || 0) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Variances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Schedule Variance (SV)"
          value={evmData.sv}
          displayFormat="currency"
          status={evmData.sv >= 0 ? 'good' : 'critical'}
          targetValue={0}
        />
        <MetricCard
          title="Cost Variance (CV)"
          value={evmData.cv}
          displayFormat="currency"
          status={evmData.cv >= 0 ? 'good' : 'critical'}
          targetValue={0}
        />
      </div>

      {/* Forecasts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Estimate at Completion (EAC)"
          value={evmData.eac}
          displayFormat="currency"
          status={evmData.eac <= evmData.budget ? 'good' : evmData.eac <= evmData.budget * 1.1 ? 'warning' : 'critical'}
          targetValue={evmData.budget}
        />
        <MetricCard
          title="Estimate to Complete (ETC)"
          value={evmData.etc}
          displayFormat="currency"
          status="neutral"
        />
        <MetricCard
          title="Variance at Completion (VAC)"
          value={evmData.vac}
          displayFormat="currency"
          status={evmData.vac >= 0 ? 'good' : 'critical'}
          targetValue={0}
        />
      </div>

      {/* Earned Value Trend */}
      {history.length > 0 && (
        <TrendChart
          title="Earned Value Trend"
          data={history}
          height={300}
          color="#3B82F6"
          formatValue={(val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          formatDate={(date) => new Date(date).toLocaleDateString()}
        />
      )}

      {/* Performance Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">To Complete Performance Index (TCPI)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {evmData.tcpi !== null ? evmData.tcpi.toFixed(2) : 'N/A'}
            </div>
            {evmData.tcpi !== null && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {evmData.tcpi > 1 ? 'More efficient performance required' :
                 evmData.tcpi === 1 ? 'Current performance acceptable' :
                 'Current performance sufficient'}
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Project Completion</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {evmData.completion.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {evmData.completion >= 90 ? 'Near completion' :
               evmData.completion >= 70 ? 'In progress' :
               'Early stage'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

