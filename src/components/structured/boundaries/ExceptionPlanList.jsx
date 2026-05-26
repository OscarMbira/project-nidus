import { useState } from 'react';
import { AlertTriangle, Calendar, DollarSign, Edit2, Plus, TrendingUp } from 'lucide-react';

export default function ExceptionPlanList({ plans, onEdit, onRefresh, onAdd }) {
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'under-review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      implemented: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };
    return colors[status] || colors.draft;
  };

  const getExceptionTypeColor = (type) => {
    const colors = {
      budget: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      schedule: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      scope: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      risk: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      combined: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[type] || colors.combined;
  };

  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Exception Plans Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create exception plans when tolerance breaches occur to document recovery actions
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Exception Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exception Plans
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Exception Plan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.plan_title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.approval_status)}`}>
                        {plan.approval_status?.replace('-', ' ')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getExceptionTypeColor(plan.exception_type)}`}>
                        {plan.exception_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(plan.plan_date).toLocaleDateString()}
                      </span>
                      {plan.solution_approach && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize">{plan.solution_approach.replace('-', ' ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exception Description */}
                {plan.exception_description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {plan.exception_description}
                    </p>
                  </div>
                )}

                {/* Tolerance Breach */}
                {plan.tolerance_type && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Tolerance Type:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                          {plan.tolerance_type}
                        </span>
                      </div>
                      {plan.tolerance_threshold && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Threshold:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {plan.tolerance_threshold}
                          </span>
                        </div>
                      )}
                      {plan.variance_amount && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                          <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                            {plan.variance_amount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Impact Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.additional_time_required_days && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Additional time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {plan.additional_time_required_days} days
                      </span>
                    </div>
                  )}
                  {plan.additional_budget_required && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Additional budget:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(plan.additional_budget_required).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Implementation Status */}
                {plan.implementation_status && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">Implementation:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {plan.implementation_status.replace('-', ' ')}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onEdit(plan)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                title="View/Edit plan"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
