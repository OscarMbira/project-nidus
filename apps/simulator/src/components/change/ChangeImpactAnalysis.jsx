import { useState } from 'react';
import { AlertTriangle, DollarSign, Calendar, Package, TrendingUp, TrendingDown } from 'lucide-react';

export default function ChangeImpactAnalysis({ changeRequest, onUpdate }) {
  const [impactData, setImpactData] = useState({
    cost_impact: changeRequest?.cost_impact || 0,
    cost_impact_currency: changeRequest?.cost_impact_currency || 'USD',
    schedule_impact_days: changeRequest?.schedule_impact_days || 0,
    scope_impact_description: changeRequest?.scope_impact_description || '',
    quality_impact_description: changeRequest?.quality_impact_description || '',
    resource_impact_description: changeRequest?.resource_impact_description || '',
    risk_impact_description: changeRequest?.risk_impact_description || '',
    overall_impact_severity: changeRequest?.overall_impact_severity || 'low',
    impact_assessment_notes: changeRequest?.impact_assessment_notes || '',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? (value ? parseFloat(value) : 0) : value;
    
    setImpactData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    if (onUpdate) {
      onUpdate({
        ...impactData,
        [name]: newValue,
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Impact Severity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Overall Impact Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Impact Severity *
            </label>
            <select
              name="overall_impact_severity"
              value={impactData.overall_impact_severity}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex items-end">
            <span className={`px-4 py-2 rounded-lg font-medium ${getSeverityColor(impactData.overall_impact_severity)}`}>
              {impactData.overall_impact_severity?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Impact */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          Financial Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost Impact
            </label>
            <div className="flex gap-2">
              <select
                name="cost_impact_currency"
                value={impactData.cost_impact_currency}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
              <input
                type="number"
                name="cost_impact"
                value={impactData.cost_impact || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            {impactData.cost_impact > 0 && (
              <div className="mt-2 flex items-center gap-2">
                {impactData.cost_impact > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                <span className={`text-sm font-medium ${
                  impactData.cost_impact > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {impactData.cost_impact > 0 ? 'Cost Increase' : 'Cost Savings'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Impact */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Schedule Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Impact (Days)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="schedule_impact_days"
                value={impactData.schedule_impact_days || ''}
                onChange={handleChange}
                step="0.5"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
            </div>
            {impactData.schedule_impact_days !== 0 && (
              <div className="mt-2 flex items-center gap-2">
                {impactData.schedule_impact_days > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Delay: +{impactData.schedule_impact_days} days
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Acceleration: {Math.abs(impactData.schedule_impact_days)} days
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scope Impact */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Scope Impact
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scope Impact Description
          </label>
          <textarea
            name="scope_impact_description"
            value={impactData.scope_impact_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe how this change affects project scope..."
          />
        </div>
      </div>

      {/* Other Impacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quality Impact
          </h3>
          <textarea
            name="quality_impact_description"
            value={impactData.quality_impact_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe quality implications..."
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resource Impact
          </h3>
          <textarea
            name="resource_impact_description"
            value={impactData.resource_impact_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe resource implications..."
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Risk Impact
          </h3>
          <textarea
            name="risk_impact_description"
            value={impactData.risk_impact_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe risk implications..."
          />
        </div>
      </div>

      {/* Assessment Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Assessment Notes
        </h3>
        <textarea
          name="impact_assessment_notes"
          value={impactData.impact_assessment_notes}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional notes about the impact assessment..."
        />
      </div>
    </div>
  );
}

