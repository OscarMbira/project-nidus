import { Target, TrendingUp, CheckCircle } from 'lucide-react';

export default function BenefitsRealizationChart({ benefits = [] }) {
  const totalBenefits = benefits.length;
  const realizedBenefits = benefits.filter(b => b.benefit_status === 'realized' || b.benefit_status === 'achieved').length;
  const inProgressBenefits = benefits.filter(b => b.benefit_status === 'in_progress' || b.benefit_status === 'planned').length;
  const notStartedBenefits = totalBenefits - realizedBenefits - inProgressBenefits;

  const realizationPercentage = totalBenefits > 0
    ? (realizedBenefits / totalBenefits) * 100
    : 0;

  // Calculate total expected vs actual value
  const expectedValue = benefits.reduce((sum, b) => sum + (parseFloat(b.expected_value) || 0), 0);
  const actualValue = benefits
    .filter(b => b.benefit_status === 'realized' || b.benefit_status === 'achieved')
    .reduce((sum, b) => sum + (parseFloat(b.actual_value || b.expected_value) || 0), 0);

  const valueRealization = expectedValue > 0
    ? (actualValue / expectedValue) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Benefits Realization
        </h3>
        <Target className="h-5 w-5 text-gray-400" />
      </div>

      {totalBenefits === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No benefits defined</p>
        </div>
      ) : (
        <>
          {/* Realization Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Benefits Realized
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {realizedBenefits} / {totalBenefits} ({Math.round(realizationPercentage)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${realizationPercentage}%` }}
              />
            </div>
          </div>

          {/* Benefits Breakdown */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {realizedBenefits}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Realized
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inProgressBenefits}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                In Progress
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Target className="h-6 w-6 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {notStartedBenefits}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Not Started
              </div>
            </div>
          </div>

          {/* Value Realization */}
          {expectedValue > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Value Realization
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {Math.round(valueRealization)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${valueRealization}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Actual: ${actualValue.toLocaleString()}</span>
                <span>Expected: ${expectedValue.toLocaleString()}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

