import { useState } from 'react';
import { FileCheck, Edit2, Trash2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { deleteBoardDecision } from '../../../services/directingProjectService';

export default function BoardDecisionList({ decisions, onEdit, onRefresh, meetingId }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (decisionId) => {
    if (!confirm('Are you sure you want to delete this decision?')) return;

    try {
      setDeletingId(decisionId);
      await deleteBoardDecision(decisionId);
      onRefresh();
    } catch (error) {
      console.error('Error deleting decision:', error);
      alert('Error deleting decision: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'deferred':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getDecisionTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'tactical':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'operational':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'approval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'deferred':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileCheck className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileCheck className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Decisions Yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {meetingId
            ? 'No decisions have been recorded for this meeting'
            : 'Board decisions will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Board Decisions ({decisions.length})
        </h3>
      </div>

      <div className="space-y-4">
        {decisions.map((decision, index) => (
          <div
            key={decision.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {decision.decision_title}
                  </h4>
                  {decision.decision_number && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                      #{decision.decision_number}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(
                      decision.decision_status
                    )}`}
                  >
                    {getStatusIcon(decision.decision_status)}
                    {decision.decision_status?.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getDecisionTypeColor(
                      decision.decision_type
                    )}`}
                  >
                    {decision.decision_type?.replace('_', ' ')}
                  </span>
                  {decision.priority && (
                    <span
                      className={`text-xs font-semibold uppercase ${getPriorityColor(
                        decision.priority
                      )}`}
                    >
                      {decision.priority}
                    </span>
                  )}
                </div>
                {decision.decision_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {decision.decision_description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(decision)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="Edit decision"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(decision.id)}
                  disabled={deletingId === decision.id}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                  title="Delete decision"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {decision.decision_date && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Decision Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {format(new Date(decision.decision_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {decision.implementation_deadline && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Deadline:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {format(new Date(decision.implementation_deadline), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {decision.rationale && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Rationale:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {decision.rationale}
                </p>
              </div>
            )}

            {decision.action_required && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Action Required:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {decision.action_required}
                </p>
              </div>
            )}

            {decision.board_meeting && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Meeting: {decision.board_meeting.meeting_type?.replace('_', ' ')} on{' '}
                  {format(new Date(decision.board_meeting.meeting_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
