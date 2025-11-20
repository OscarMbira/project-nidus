import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Edit2, Trash2, Eye, FileText } from 'lucide-react';
import { deleteQualityRegisterItem } from '../../services/qualityManagementService';

export default function QualityRegister({ items = [], onEdit, onView, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.product_name}" from the quality register?`)) {
      return;
    }

    try {
      setDeleting(item.id);
      await deleteQualityRegisterItem(item.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting quality register item:', error);
      alert('Error deleting item: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'in-review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'in-review':
        return <Clock className="h-4 w-4" />;
      case 'conditional':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Quality Register Items
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add products and deliverables to track quality
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Product/Deliverable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quality Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quality Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Review Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.product_name}
                    </div>
                    {item.product_reference && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.product_reference}
                      </div>
                    )}
                    {item.project && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.project.project_name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {item.product_type || 'N/A'}
                  </span>
                  {item.product_category && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.product_category}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {item.quality_method?.replace('-', ' ') || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(item.quality_status)}`}>
                    {getStatusIcon(item.quality_status)}
                    {item.quality_status?.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.quality_score !== null ? (
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${
                        item.quality_score >= 90 ? 'text-green-600 dark:text-green-400' :
                        item.quality_score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(item.quality_score)}%
                      </div>
                      {item.quality_issues_found > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({item.quality_issues_found} issues)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not scored</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.quality_review_actual_date ? (
                    new Date(item.quality_review_actual_date).toLocaleDateString()
                  ) : item.quality_review_planned_date ? (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {new Date(item.quality_review_planned_date).toLocaleDateString()}
                    </span>
                  ) : (
                    'Not scheduled'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deleting === item.id}
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
  );
}

