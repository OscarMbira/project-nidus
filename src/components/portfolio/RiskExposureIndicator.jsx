import { AlertTriangle, Shield, ShieldAlert } from 'lucide-react';

export default function RiskExposureIndicator({ risks = [] }) {
  const riskCounts = risks.reduce((acc, risk) => {
    const rating = risk.risk_rating || 'low';
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});

  const totalRisks = risks.length;
  const criticalRisks = riskCounts.critical || 0;
  const highRisks = riskCounts.high || 0;
  const mediumRisks = riskCounts.medium || 0;
  const lowRisks = riskCounts.low || 0;

  // Calculate risk exposure index (0-100)
  const exposureIndex = totalRisks > 0
    ? ((criticalRisks * 100 + highRisks * 75 + mediumRisks * 50 + lowRisks * 25) / totalRisks)
    : 0;

  // Determine risk level
  let riskLevel, color, bgColor, icon;
  if (exposureIndex >= 75) {
    riskLevel = 'Critical';
    color = '#EF4444';
    bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    icon = ShieldAlert;
  } else if (exposureIndex >= 50) {
    riskLevel = 'High';
    color = '#F59E0B';
    bgColor = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    icon = AlertTriangle;
  } else if (exposureIndex >= 25) {
    riskLevel = 'Medium';
    color = '#3B82F6';
    bgColor = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    icon = Shield;
  } else {
    riskLevel = 'Low';
    color = '#10B981';
    bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    icon = Shield;
  }

  const Icon = icon;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${bgColor} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Risk Exposure
        </h3>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>

      {/* Risk Exposure Index */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold mb-2" style={{ color }}>
          {Math.round(exposureIndex)}
        </div>
        <div className="text-sm font-medium mb-1" style={{ color }}>
          {riskLevel} Risk Level
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Risk Exposure Index (0-100)
        </div>
      </div>

      {/* Risk breakdown */}
      <div className="space-y-3">
        {criticalRisks > 0 && (
          <RiskBar
            label="Critical"
            count={criticalRisks}
            total={totalRisks}
            color="#EF4444"
          />
        )}
        {highRisks > 0 && (
          <RiskBar
            label="High"
            count={highRisks}
            total={totalRisks}
            color="#F59E0B"
          />
        )}
        {mediumRisks > 0 && (
          <RiskBar
            label="Medium"
            count={mediumRisks}
            total={totalRisks}
            color="#3B82F6"
          />
        )}
        {lowRisks > 0 && (
          <RiskBar
            label="Low"
            count={lowRisks}
            total={totalRisks}
            color="#10B981"
          />
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Risks:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {totalRisks}
          </span>
        </div>
        {(criticalRisks > 0 || highRisks > 0) && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600 dark:text-gray-400">High/Critical:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {criticalRisks + highRisks}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

