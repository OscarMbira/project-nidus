import { Users, TrendingUp, AlertTriangle, Activity, Calendar } from 'lucide-react';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function ResourceUtilizationList({ utilization, onRefresh }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'over-utilized':
      case 'over-allocated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'optimal':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'under-utilized':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (utilization.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Utilization Data yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Utilization data will appear here once resources are allocated and tracked
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
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {utilization.map((util, index) => (
                <tr key={util.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {util.resource?.resource_name || 'Unknown Resource'}
                        </div>
                        {util.resource?.resource_code && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {util.resource.resource_code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div>
                        <div>{util.utilization_period_start_date ? new Date(util.utilization_period_start_date).toLocaleDateString() : 'N/A'}</div>
                        {util.utilization_period_end_date && (
                          <div className="text-xs">to {new Date(util.utilization_period_end_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">{util.total_capacity_hours?.toLocaleString() || 0} hrs</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">{util.total_allocated_hours?.toLocaleString() || 0} hrs</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {util.allocated_projects_count || 0} projects
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">{util.actual_worked_hours?.toLocaleString() || 0} hrs</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {util.billable_hours || 0} billable
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                        <div
                          className={`h-2 rounded-full ${
                            (util.actual_utilization_percentage || 0) > 100
                              ? 'bg-red-600'
                              : (util.actual_utilization_percentage || 0) >= 80
                              ? 'bg-green-600'
                              : (util.actual_utilization_percentage || 0) >= 50
                              ? 'bg-yellow-600'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(util.actual_utilization_percentage || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.round(util.actual_utilization_percentage || 0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {util.utilization_status && (
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(util.utilization_status)}`}>
                        {util.utilization_status}
                      </span>
                    )}
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

