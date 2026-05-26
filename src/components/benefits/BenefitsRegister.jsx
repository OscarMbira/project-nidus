import { useState } from 'react';
import { Target, Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { deleteBenefit, calculateBenefitRealization } from '../../services/benefitsService';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function BenefitsRegister({ benefits = [], onEdit, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (benefit) => {
    if (!window.confirm(`Are you sure you want to delete benefit "${benefit.benefit_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(benefit.id);
      await deleteBenefit(benefit.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting benefit:', error);
      alert('Error deleting benefit: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'realized':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'partially_realized':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'planned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'identified':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'financial':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'operational':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'strategic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'customer':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      case 'employee':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'realized':
        return CheckCircle;
      case 'partially_realized':
        return TrendingUp;
      case 'in_progress':
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  if (benefits.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Benefits Registered
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first benefit to start tracking benefits realization
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Benefit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Context
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {benefits.map((benefit, index) => {
                const StatusIcon = getStatusIcon(benefit.benefit_status);
                const realizationPercentage = benefit.target_value && benefit.target_value > 0
                  ? ((benefit.realized_value || benefit.current_value || 0) / benefit.target_value) * 100
                  : 0;

                return (
                  <tr key={benefit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {benefit.benefit_name}
                        </div>
                        {benefit.benefit_code && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {benefit.benefit_code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getCategoryColor(benefit.benefit_category)}`}>
                        {benefit.benefit_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {benefit.portfolio && (
                          <div className="text-xs">Portfolio: {benefit.portfolio.portfolio_name}</div>
                        )}
                        {benefit.programme && (
                          <div className="text-xs">Programme: {benefit.programme.programme_name}</div>
                        )}
                        {benefit.project && (
                          <div className="text-xs">Project: {benefit.project.project_name}</div>
                        )}
                        {!benefit.portfolio && !benefit.programme && !benefit.project && (
                          <span className="text-xs text-gray-400">No context</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor(benefit.benefit_status)}`}>
                          {benefit.benefit_status?.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              realizationPercentage >= 100
                                ? 'bg-green-500'
                                : realizationPercentage >= 75
                                ? 'bg-blue-500'
                                : realizationPercentage >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, realizationPercentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem]">
                          {Math.round(realizationPercentage)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {benefit.estimated_value && (
                          <div>
                            Est: {benefit.value_currency || 'USD'} {parseFloat(benefit.estimated_value).toLocaleString()}
                          </div>
                        )}
                        {benefit.realized_value_currency && (
                          <div className="text-green-600 dark:text-green-400">
                            Real: {benefit.value_currency || 'USD'} {parseFloat(benefit.realized_value_currency).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (onEdit) {
                              onEdit(benefit);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(benefit)}
                          disabled={deleting === benefit.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

