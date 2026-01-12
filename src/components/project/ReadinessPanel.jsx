import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * ReadinessPanel Component
 * Displays project readiness validation results
 * Shows pass/fail status and list of validation issues
 */
const ReadinessPanel = ({ readinessData, onValidate, isValidating, projectId }) => {
  if (!readinessData && !isValidating) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Readiness Validation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Validate if this project meets authorisation readiness criteria
              </p>
            </div>
          </div>
          <button
            onClick={onValidate}
            disabled={!projectId || isValidating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? 'Validating...' : 'Validate Readiness'}
          </button>
        </div>
        {!projectId && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            Save the project as a draft first before validating readiness
          </p>
        )}
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-blue-800 dark:text-blue-200">
            Validating project readiness...
          </p>
        </div>
      </div>
    );
  }

  const { readiness_status, issues, issues_count } = readinessData;
  const isPassed = readiness_status === 'pass';

  return (
    <div
      className={`border rounded-lg p-6 ${
        isPassed
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {isPassed ? (
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <h3
              className={`text-lg font-semibold ${
                isPassed
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}
            >
              {isPassed ? 'Readiness Check Passed' : 'Readiness Check Failed'}
            </h3>
            <p
              className={`text-sm mt-1 ${
                isPassed
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {isPassed
                ? 'This project meets all authorisation readiness criteria and can be authorised by PMO Admin.'
                : `This project has ${issues_count} validation ${
                    issues_count === 1 ? 'issue' : 'issues'
                  } that must be resolved before authorisation.`}
            </p>

            {!isPassed && issues && issues.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Validation Issues:
                </h4>
                <ul className="space-y-2">
                  {issues.map((issue, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium">{issue.field}:</span>{' '}
                        {issue.message}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onValidate}
          disabled={isValidating}
          className="ml-4 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Re-validate
        </button>
      </div>
    </div>
  );
};

export default ReadinessPanel;
