import { AlertTriangle, Shield, ShieldAlert } from 'lucide-react';

export default function ProgrammeRiskIndicator({ risks = [], dependencies = [] }) {
  // Calculate programme risk level from risks and dependencies
  const totalRisks = risks.length;
  const criticalRisks = risks.filter(r => r.risk_rating === 'critical').length;
  const highRisks = risks.filter(r => r.risk_rating === 'high').length;
  const mediumRisks = risks.filter(r => r.risk_rating === 'medium').length;
  const lowRisks = risks.filter(r => r.risk_rating === 'low').length;

  // Calculate dependency risks
  const criticalDependencies = dependencies.filter(d => 
    d.dependency_criticality === 'critical' || d.is_critical_path
  ).length;
  const atRiskDependencies = dependencies.filter(d => 
    d.dependency_status === 'at_risk' || d.dependency_status === 'blocked'
  ).length;

  // Calculate overall risk level
  const riskScore = totalRisks > 0
    ? ((criticalRisks * 100 + highRisks * 75 + mediumRisks * 50 + lowRisks * 25) / totalRisks) +
      (criticalDependencies * 20) + (atRiskDependencies * 10)
    : 0;

  let riskLevel, color, bgColor, icon;
  if (riskScore >= 75 || criticalRisks > 0 || criticalDependencies > 0) {
    riskLevel = 'Critical';
    color = '#EF4444';
    bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    icon = ShieldAlert;
  } else if (riskScore >= 50 || highRisks > 0 || atRiskDependencies > 0) {
    riskLevel = 'High';
    color = '#F59E0B';
    bgColor = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    icon = AlertTriangle;
  } else if (riskScore >= 25 || mediumRisks > 0) {
    riskLevel = 'Medium';
    color = '#3B82F6';
    bgColor = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    icon = AlertTriangle;
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
          Programme Risk Level
        </h3>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>

      {/* Risk Level */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold mb-2" style={{ color }}>
          {riskLevel}
        </div>
        <div className="text-sm font-medium mb-1" style={{ color }}>
          Risk Level
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Risk Score: {Math.round(riskScore)}
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="space-y-4">
        {/* Project Risks */}
        {totalRisks > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Risks
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {totalRisks}
              </span>
            </div>
            <div className="space-y-2">
              {criticalRisks > 0 && (
                <RiskBar label="Critical" count={criticalRisks} total={totalRisks} color="#EF4444" />
              )}
              {highRisks > 0 && (
                <RiskBar label="High" count={highRisks} total={totalRisks} color="#F59E0B" />
              )}
              {mediumRisks > 0 && (
                <RiskBar label="Medium" count={mediumRisks} total={totalRisks} color="#3B82F6" />
              )}
              {lowRisks > 0 && (
                <RiskBar label="Low" count={lowRisks} total={totalRisks} color="#10B981" />
              )}
            </div>
          </div>
        )}

        {/* Dependency Risks */}
        {(criticalDependencies > 0 || atRiskDependencies > 0) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dependency Risks
              </span>
            </div>
            <div className="space-y-2">
              {criticalDependencies > 0 && (
                <RiskBar 
                  label="Critical Dependencies" 
                  count={criticalDependencies} 
                  total={dependencies.length || 1} 
                  color="#EF4444" 
                />
              )}
              {atRiskDependencies > 0 && (
                <RiskBar 
                  label="At Risk Dependencies" 
                  count={atRiskDependencies} 
                  total={dependencies.length || 1} 
                  color="#F59E0B" 
                />
              )}
            </div>
          </div>
        )}

        {totalRisks === 0 && criticalDependencies === 0 && atRiskDependencies === 0 && (
          <div className="text-center py-4">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No significant risks identified
            </p>
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

