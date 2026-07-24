import { useState } from 'react';
import { FileCheck, Calendar, DollarSign, Edit2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { deleteProjectBoard } from '../../../services/directingProjectService';

export default function AuthorizationList({ authorizations, onEdit, onRefresh, onAdd }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this authorization?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteProjectBoard(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting authorization:', error);
      alert('Error deleting authorization: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      Superseded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      Revoked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      Expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[status] || colors.Active;
  };

  const getTypeLabel = (type) => {
    const labels = {
      Project_Initiation: 'Project Initiation',
      Stage_Authorization: 'Stage Authorization',
      Exception_Plan: 'Exception Plan',
      Project_Closure: 'Project Closure',
      Budget_Change: 'Budget Change',
      Scope_Change: 'Scope Change'
    };
    return labels[type] || type;
  };

  if (!authorizations || authorizations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileCheck className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Authorizations Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first project authorization to track board approvals and tolerances
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Authorization
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Authorizations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {authorizations.length} {authorizations.length === 1 ? 'authorization' : 'authorizations'}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Authorization
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {authorizations.map((auth, index) => (
          <div
            key={auth.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getTypeLabel(auth.authorization_type)}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(auth.authorization_status)}`}>
                        {auth.authorization_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(auth.authorization_date).toLocaleDateString()}
                      </span>
                      {auth.authorized_amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {new Date(auth.authorized_amount).toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tolerances */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Tolerances
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ±{auth.cost_tolerance_percent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Time:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ±{auth.time_tolerance_days} days
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Scope:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {auth.scope_tolerance}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {auth.authorization_notes && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                    <p className="line-clamp-2">{auth.authorization_notes}</p>
                  </div>
                )}

                {/* Conditions */}
                {auth.conditions && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Conditions:</p>
                    <p className="line-clamp-2">{auth.conditions}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(auth)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  title="Edit authorization"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(auth.id)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  disabled={deleting === auth.id}
                  title="Delete authorization"
                >
                  {deleting === auth.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
