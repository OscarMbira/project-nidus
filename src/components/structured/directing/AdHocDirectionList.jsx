import { useState } from 'react';
import { MessageSquare, Calendar, AlertCircle, Edit2, Plus, CheckCircle, Clock } from 'lucide-react';

export default function AdHocDirectionList({ directions, onEdit, onRefresh, onAdd }) {
  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      Under_Review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Responded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      Deferred: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      Withdrawn: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors.Pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
      High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
    };
    return colors[priority] || colors.Medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      Guidance: MessageSquare,
      Decision: CheckCircle,
      Escalation: AlertCircle,
      Approval: CheckCircle,
      Exception: AlertCircle,
      Clarification: MessageSquare
    };
    return icons[type] || MessageSquare;
  };

  const getStatusLabel = (status) => {
    return status.replace('_', ' ');
  };

  if (!directions || directions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <MessageSquare className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Ad-Hoc Directions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Request direction from the Project Board when guidance is needed outside of regular meetings
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Request Direction
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ad-Hoc Directions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {directions.length} {directions.length === 1 ? 'request' : 'requests'}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Request Direction
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {directions.map((direction) => {
          const TypeIcon = getTypeIcon(direction.direction_type);
          const isOverdue = direction.response_required_by &&
            new Date(direction.response_required_by) < new Date() &&
            direction.direction_status === 'Pending';

          return (
            <div
              key={direction.id}
              className={`bg-white dark:bg-gray-800 border rounded-lg p-6 hover:shadow-md transition-shadow ${
                isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-lg border ${getPriorityColor(direction.priority)}`}>
                      <TypeIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {direction.direction_title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(direction.direction_status)}`}>
                          {getStatusLabel(direction.direction_status)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(direction.priority)}`}>
                          {direction.priority} Priority
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Requested: {new Date(direction.request_date).toLocaleDateString()}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{direction.direction_type}</span>
                        {direction.response_required_by && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                              <Clock className="h-4 w-4" />
                              Response by: {new Date(direction.response_required_by).toLocaleDateString()}
                              {isOverdue && ' (Overdue)'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request Description */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {direction.request_description}
                    </p>
                  </div>

                  {/* Business Justification */}
                  {direction.business_justification && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                        Business Justification:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-400 line-clamp-2">
                        {direction.business_justification}
                      </p>
                    </div>
                  )}

                  {/* Board Response */}
                  {direction.board_response && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-xs font-medium text-green-900 dark:text-green-300">
                          Board Response {direction.response_date && `(${new Date(direction.response_date).toLocaleDateString()})`}
                        </p>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-400 line-clamp-3">
                        {direction.board_response}
                      </p>
                    </div>
                  )}

                  {/* Requested By */}
                  {direction.requested_by_user && (
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Requested by: {direction.requested_by_user.full_name || direction.requested_by_user.email}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEdit(direction)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="View/Edit direction"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
