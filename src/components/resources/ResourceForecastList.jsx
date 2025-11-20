import { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, Target, TrendingUp, Calendar } from 'lucide-react';
import { deleteResourceForecast } from '../../services/crossResourceService';

export default function ResourceForecastList({ forecasts, onEdit, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (forecast) => {
    if (!window.confirm(`Are you sure you want to delete this forecast? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(forecast.id);
      await deleteResourceForecast(forecast.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting forecast:', error);
      alert('Error deleting forecast: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  if (forecasts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Resource Forecasts yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first resource forecast to plan capacity across projects
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Forecast Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resource Type/Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Demand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supply Gap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {forecasts.map((forecast) => (
                <tr key={forecast.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {forecast.forecast_start_date ? new Date(forecast.forecast_start_date).toLocaleDateString() : 'N/A'}
                        </div>
                        {forecast.forecast_end_date && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            to {new Date(forecast.forecast_end_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {forecast.forecast_type || 'monthly'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{forecast.resource_category || 'All Categories'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {forecast.resource_type || 'All Types'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{forecast.forecasted_demand_count || 0} resources</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {forecast.forecasted_demand_hours?.toLocaleString() || 0} hours
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {forecast.demand_supply_gap_count > 0 ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <div className="text-sm">
                          <div className="font-medium text-orange-600 dark:text-orange-400">
                            {forecast.demand_supply_gap_count} gap
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {forecast.demand_supply_gap_hours?.toLocaleString() || 0} hours
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-green-500" />
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          No Gap
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{forecast.forecast_confidence_percentage || 0}%</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {forecast.forecast_confidence_level || 'unknown'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (onEdit) {
                            onEdit(forecast);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(forecast)}
                        disabled={deleting === forecast.id}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

