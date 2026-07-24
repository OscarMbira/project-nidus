import React, { useState } from 'react';
import { CheckCircle, XCircle, PauseCircle, X } from 'lucide-react';

/**
 * AuthorisationActions Component
 * Displays authorisation action buttons for PMO Admins
 * Handles Authorise, Reject, and Suspend actions with modals
 */
const AuthorisationActions = ({
  projectId,
  readinessStatus,
  isPmoAdmin,
  intakeStatus,
  onAuthorise,
  onReject,
  onSuspend,
  isProcessing
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [errors, setErrors] = useState({});

  // Don't show if not PMO Admin or no project ID
  if (!isPmoAdmin || !projectId) {
    return null;
  }

  // Don't show if already authorised
  if (intakeStatus === 'authorised') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Project Authorised
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              This project has been authorised and is ready for execution.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if rejected
  if (intakeStatus === 'rejected') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Project Rejected
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              This project has been rejected by PMO Admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if suspended
  if (intakeStatus === 'suspended') {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <PauseCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              Project Suspended
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              This project has been suspended by PMO Admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canAuthorise = readinessStatus === 'pass';

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrors({ reject: 'Rejection reason is required' });
      return;
    }

    await onReject(rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
    setErrors({});
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      setErrors({ suspend: 'Suspension reason is required' });
      return;
    }

    await onSuspend(suspensionReason);
    setShowSuspendModal(false);
    setSuspensionReason('');
    setErrors({});
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        PMO Admin Actions
      </h3>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAuthorise}
          disabled={!canAuthorise || isProcessing}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          title={!canAuthorise ? 'Project must pass readiness validation first' : ''}
        >
          <CheckCircle className="h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Authorise Project'}
        </button>

        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <XCircle className="h-4 w-4" />
          Reject Project
        </button>

        <button
          onClick={() => setShowSuspendModal(true)}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <PauseCircle className="h-4 w-4" />
          Suspend Project
        </button>
      </div>

      {!canAuthorise && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
          Project must pass readiness validation before it can be authorised
        </p>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Reject Project
                </h3>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting this project. This will be recorded in the audit log.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setErrors({});
                  }}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter detailed rejection reason..."
                />
                {errors.reject && (
                  <p className="text-sm text-red-600 mt-1">{errors.reject}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Rejecting...' : 'Reject Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Suspend Project
                </h3>
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason('');
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please provide a reason for suspending this project. This will be recorded in the audit log.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Suspension Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => {
                    setSuspensionReason(e.target.value);
                    setErrors({});
                  }}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter detailed suspension reason..."
                />
                {errors.suspend && (
                  <p className="text-sm text-red-600 mt-1">{errors.suspend}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason('');
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Suspending...' : 'Suspend Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorisationActions;
