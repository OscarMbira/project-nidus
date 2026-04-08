/**
 * Benefits Review Plan View Component
 * Read-only view of Benefits Review Plan matching PDF template
 */

import { FileText, Edit2, Download, Share2, CheckCircle, Clock, XCircle, Archive, Printer } from 'lucide-react';

export default function BenefitsReviewPlanView({ plan, onEdit, onExport, onApprove, onDistribute, onPrint }) {
  if (!plan) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No Benefits Review Plan found</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Edit2, label: 'Draft' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, label: 'Approved' },
      archived: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Archive, label: 'Archived' },
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="border-b-2 border-gray-300 dark:border-gray-600 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              BENEFITS REVIEW PLAN
            </h1>
            {plan.document_ref && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Document Ref: {plan.document_ref} | Version: {plan.version_number || '1.0'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(plan.status)}
            {onEdit && plan.status === 'draft' && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Document Metadata Table */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Project:</span>{' '}
            <span className="text-gray-900 dark:text-white">{plan.project?.project_name || 'N/A'}</span>
          </div>
          {plan.release && (
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Release:</span>{' '}
              <span className="text-gray-900 dark:text-white">{plan.release}</span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Date:</span>{' '}
            <span className="text-gray-900 dark:text-white">{formatDate(plan.plan_date)}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Author:</span>{' '}
            <span className="text-gray-900 dark:text-white">{plan.author?.full_name || plan.author?.email || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Owner:</span>{' '}
            <span className="text-gray-900 dark:text-white">{plan.owner?.full_name || plan.owner?.email || 'N/A'}</span>
          </div>
          {plan.client && (
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Client:</span>{' '}
              <span className="text-gray-900 dark:text-white">{plan.client}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-6 space-y-8">
        {/* 3. Scope */}
        {plan.scope_description && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              3. Scope
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{plan.scope_description}</p>
            {plan.benefits_coverage_notes && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benefits Coverage Notes:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.benefits_coverage_notes}</p>
              </div>
            )}
          </section>
        )}

        {/* 4. Accountability */}
        {plan.accountability_description && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              4. Accountability
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{plan.accountability_description}</p>
          </section>
        )}

        {/* 5. Benefits Measurement */}
        {plan.measurement_approach && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              5. Benefits Measurement
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{plan.measurement_approach}</p>
            {plan.measurement_timing_rationale && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timing Rationale:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.measurement_timing_rationale}</p>
              </div>
            )}
          </section>
        )}

        {/* 6. Resources */}
        {(plan.resources_description || plan.estimated_review_effort_hours || plan.estimated_review_cost) && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              6. Resources
            </h2>
            {plan.resources_description && (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{plan.resources_description}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {plan.estimated_review_effort_hours && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Total Effort:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{plan.estimated_review_effort_hours} hours</span>
                </div>
              )}
              {plan.estimated_review_cost && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Total Cost:</span>{' '}
                  <span className="text-gray-900 dark:text-white">
                    {plan.review_cost_currency || 'USD'} {parseFloat(plan.estimated_review_cost).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 7. Baseline Measures */}
        {(plan.baseline_measures_description || plan.baseline_recording_date || plan.baseline_source) && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              7. Baseline Measures
            </h2>
            {plan.baseline_measures_description && (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{plan.baseline_measures_description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {plan.baseline_recording_date && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Recording Date:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{formatDate(plan.baseline_recording_date)}</span>
                </div>
              )}
              {plan.baseline_source && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Source:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{plan.baseline_source}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 8. Performance Review */}
        {plan.performance_review_approach && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              8. Performance Review
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{plan.performance_review_approach}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {plan.performance_review_frequency && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Frequency:</span>{' '}
                  <span className="text-gray-900 dark:text-white capitalize">{plan.performance_review_frequency.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>
            {plan.performance_review_criteria && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Criteria:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.performance_review_criteria}</p>
              </div>
            )}
          </section>
        )}

        {/* Dis-benefits */}
        {plan.dis_benefits_included && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              Dis-benefits Consideration
            </h2>
            {plan.dis_benefits_description && (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{plan.dis_benefits_description}</p>
            )}
          </section>
        )}
      </div>

      {/* Action Buttons */}
      {(onEdit || onExport || onApprove || onDistribute) && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap gap-3">
          {onEdit && plan.status === 'draft' && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Plan
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          )}
          {onApprove && plan.status === 'pending_approval' && (
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Manage Approvals
            </button>
          )}
          {onDistribute && plan.status === 'approved' && (
            <button
              onClick={onDistribute}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Distribute
            </button>
          )}
        </div>
      )}
    </div>
  );
}
