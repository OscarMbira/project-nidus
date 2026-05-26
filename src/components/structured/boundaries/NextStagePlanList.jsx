import { useState } from 'react';
import { ArrowRight, Calendar, DollarSign, Target, Edit2, Plus } from 'lucide-react';

export default function NextStagePlanList({ plans, onEdit, onRefresh, onAdd }) {
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'under-review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors.draft;
  };

  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Next Stage Plans Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create plans for upcoming stages to define objectives, resources, and deliverables
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Next Stage Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Next Stage Plans
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
          Create Next Stage Plan
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
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <ArrowRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.plan_title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.approval_status)}`}>
                        {plan.approval_status?.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(plan.plan_date).toLocaleDateString()}
                      </span>
                      {plan.next_stage_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {plan.next_stage_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {plan.next_stage_description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {plan.next_stage_description}
                    </p>
                  </div>
                )}

                {/* Key Details */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {plan.planned_start_date && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block mb-1">Start Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(plan.planned_start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {plan.planned_end_date && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block mb-1">End Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(plan.planned_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {plan.stage_budget && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block mb-1">Budget</span>
                        <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {parseFloat(plan.stage_budget).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Objectives */}
                {plan.stage_objectives && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      Objectives
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {plan.stage_objectives}
                    </p>
                  </div>
                )}

                {/* Tolerances */}
                {(plan.time_tolerance_days || plan.cost_tolerance_amount) && (
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    {plan.time_tolerance_days && (
                      <span>Time tolerance: ±{plan.time_tolerance_days} days</span>
                    )}
                    {plan.cost_tolerance_amount && (
                      <span>Cost tolerance: ${parseFloat(plan.cost_tolerance_amount).toLocaleString()}</span>
                    )}
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
