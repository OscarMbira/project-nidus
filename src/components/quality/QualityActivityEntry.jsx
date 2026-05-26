/**
 * Quality Activity Entry Component
 * Displays quality activity entry card matching the PDF template structure
 */

import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function QualityActivityEntry({ activity, onView }) {
  const formatDate = (date) => {
    if (!date) return '_________';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getResultIcon = (result) => {
    switch (result?.toLowerCase()) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'passed_with_conditions':
      case 'passed-with-conditions':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'deferred':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getResultText = (result) => {
    if (!result) return 'Pending';
    return result.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300 dark:border-gray-600">
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">QUALITY REGISTER</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">FORM [{activity.activity_identifier || 'N/A'}]</div>
        </div>
      </div>

      {/* Programme and Project */}
      {(activity.programme_name || activity.project_name) && (
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          {activity.programme_name && (
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Programme Name:</span>{' '}
              <span className="text-gray-900 dark:text-white">{activity.programme_name}</span>
            </div>
          )}
          {activity.project_name && (
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Project Name:</span>{' '}
              <span className="text-gray-900 dark:text-white">{activity.project_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Quality Identifier */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Quality Identifier:</div>
        <div className="text-lg font-mono text-gray-900 dark:text-white">
          {activity.activity_identifier || 'N/A'}
          {activity.is_reassessment && (
            <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
              Reassessment
            </span>
          )}
        </div>
      </div>

      {/* Product Information */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Identifier:</div>
          <div className="text-gray-900 dark:text-white">{activity.product_identifier || 'N/A'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Title:</div>
          <div className="text-gray-900 dark:text-white">{activity.product_title || 'N/A'}</div>
        </div>
      </div>

      {/* Quality Method */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Quality Method:</div>
        <div className="text-gray-900 dark:text-white capitalize">
          {activity.quality_method || 'N/A'}
        </div>
      </div>

      {/* Roles/Responsibilities */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Roles/Responsibilities:</div>
        {onView && (
          <button
            onClick={() => onView('participants')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            View Participants →
          </button>
        )}
      </div>

      {/* Result */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Result:</div>
        <div className="flex items-center gap-2">
          {getResultIcon(activity.result)}
          <span className="text-gray-900 dark:text-white font-medium">
            {getResultText(activity.result)}
          </span>
        </div>
      </div>

      {/* Quality Records */}
      <div className="mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quality Records:</div>
        {activity.quality_records_refs && Array.isArray(activity.quality_records_refs) && activity.quality_records_refs.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
            {activity.quality_records_refs.map((ref, idx) => (
              <li key={idx}>{typeof ref === 'string' ? ref : ref.title || ref.reference}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">No records linked</div>
        )}
        {onView && (
          <button
            onClick={() => onView('records')}
            className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            View All Records →
          </button>
        )}
      </div>

      {/* Dates Table */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">DATES</div>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
                <TableRowNumberHeader className="!normal-case" />
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"></th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Planned</th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Forecast</th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Actual</th>
            </tr>
          </thead>
          <tbody>
            <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Quality Activity</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.planned_date)}</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.forecast_date)}</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.actual_date)}</td>
            </tr>
            <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sign-Off</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.sign_off_planned_date)}</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.sign_off_forecast_date)}</td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white text-center">{formatDate(activity.sign_off_actual_date)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* View Details Button */}
      {onView && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={() => onView('details')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            View Full Details
          </button>
        </div>
      )}
    </div>
  );
}
