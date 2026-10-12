import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, User, DollarSign, Calendar, Package } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
import { fetchChangeRequest, fetchChangeAssessment } from '../../services/changeManagementService';
import { platformDb } from '@nidus/supabase';
import ChangeRequestForm from '../../components/change/ChangeRequestForm';
import ChangeAssessmentForm from '../../components/change/ChangeAssessmentForm';
import ChangeImpactAnalysis from '../../components/change/ChangeImpactAnalysis';
import ChangeLog from '../../components/change/ChangeLog';
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons';
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution';
import { buildChangeRequestExport, changeRequestExportFilename } from '../../lib/changeRequestExport';

export default function ChangeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [crAccountId, setCrAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [auditUserLabels, setAuditUserLabels] = useState({});

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadAssessment = async () => {
    try {
      setAssessmentLoading(true);
      const data = await fetchChangeAssessment(id);
      setAssessment(data || null);
    } catch (error) {
      console.error('Error loading assessment:', error);
    } finally {
      setAssessmentLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAssessment();
    }
  }, [id]);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        request.created_by,
        request.updated_by,
        request.submitted_by,
        request.owner_user_id,
        request.current_approver_user_id,
      ]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [request]);

  const [exportSections, setExportSections] = useState([]);
  const [exportRecord, setExportRecord] = useState(null);

  useEffect(() => {
    if (!request) {
      setExportSections([]);
      setExportRecord(null);
      return;
    }
    let cancelled = false;
    buildChangeRequestExport(platformDb, request, assessment, crAccountId, auditUserLabels).then(({ sections, record }) => {
      if (!cancelled) {
        setExportSections(sections);
        setExportRecord(record);
      }
    });
    return () => { cancelled = true; };
  }, [request, assessment, crAccountId, auditUserLabels]);

  useEffect(() => {
    // sim.practice_projects has no account_id column (unlike public.projects) — resolve the
    // current user's own org account instead, matching ChangeManagement.jsx's own pattern.
    if (!request?.project_id) {
      setCrAccountId(null);
      return;
    }
    let cancelled = false;
    getCurrentUserAccountId().then((id) => {
      if (!cancelled) setCrAccountId(id || null);
    });
    return () => {
      cancelled = true;
    };
  }, [request?.project_id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await fetchChangeRequest(id);
      setRequest(data);
    } catch (error) {
      console.error('Error loading change request:', error);
      alert('Error loading change request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'under-assessment':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'pending-approval':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'implemented':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'impact', label: 'Impact Analysis', icon: Package },
    { id: 'assessment', label: 'Assessment', icon: Clock },
    { id: 'log', label: 'Change Log', icon: FileText },
    { id: 'audit', label: 'Audit details', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Change Request Not Found
          </h3>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {request.change_reference}: {request.change_title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(request.status)}`}>
                {request.status?.replace('-', ' ')}
              </span>
              {request.priority && (
                <span className={`px-3 py-1 text-sm font-medium rounded capitalize ${
                  request.priority === 'critical' || request.priority === 'urgent'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : request.priority === 'high'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {request.priority} priority
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportRecordButtons
              sections={exportSections}
              record={exportRecord}
              baseFilename={changeRequestExportFilename(request)}
            />
            <RowActionButton
              variant="edit"
              label="Edit change request"
              onClick={() => setShowEditForm(true)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <DetailAuditTabList
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Change request sections"
          tabs={tabs.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'audit' && (
          <AuditDetailsPanel description="Who created or changed this change request, and how it is classified.">
            <AuditCard title="Identity" description="How this change request is labelled and tracked.">
              <AuditField label="Reference" value={request.change_reference} />
              <AuditField label="Title" value={request.change_title} />
              <AuditField label="Category" value={humanizeAuditToken(request.change_category)} />
              <AuditField label="Status" value={humanizeAuditToken(request.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this change request sits.">
              <AuditField label="Priority" value={humanizeAuditToken(request.priority)} />
              <AuditField label="Submitted by" value={request.submitted_by ? auditUserLabels[request.submitted_by] || null : null} />
              <AuditField label="Owner" value={request.owner_user_id ? auditUserLabels[request.owner_user_id] || null : null} />
              <AuditField label="Approver" value={request.current_approver_user_id ? auditUserLabels[request.current_approver_user_id] || null : null} />
            </AuditCard>
            <AuditCard title="Record history" description="When this change request was created and last changed.">
              <AuditField label="Created by" value={request.created_by ? auditUserLabels[request.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={request.created_at} />
              <AuditField label="Updated by" value={request.updated_by ? auditUserLabels[request.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={request.updated_at} />
              <AuditTimestampPair dateLabel="Submission date" value={request.submission_date} />
            </AuditCard>
          </AuditDetailsPanel>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Change Reference
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">{request.change_reference}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(request.status)}`}>
                    {request.status?.replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">{request.change_category || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Priority
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">{request.priority || 'N/A'}</p>
                </div>
                {request.submission_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Submitted Date
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(request.submission_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {request.submitted_by && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Requested By
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {auditUserLabels[request.submitted_by] || 'Unknown'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Owner
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {request.owner_user_id ? (auditUserLabels[request.owner_user_id] || 'Unknown') : 'Not assigned'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Approver
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {request.current_approver_user_id ? (auditUserLabels[request.current_approver_user_id] || 'Unknown') : 'Not yet assigned'}
                  </p>
                </div>
                {request.change_description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {request.change_description}
                    </p>
                  </div>
                )}
                {request.business_rationale && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Business rationale
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {request.business_rationale}
                    </p>
                  </div>
                )}
                {request.impact_summary && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Impact
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {request.impact_summary}
                    </p>
                  </div>
                )}
                {request.status_reason && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Decision Notes
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {request.status_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {crAccountId && request.project_id && request.id && (
              <CustomFieldRenderer
                platformDb={platformDb}
                accountId={crAccountId}
                projectId={request.project_id}
                entityType="change_request"
                entityId={request.id}
                screenCode="change_request_detail"
              />
            )}
          </div>
        )}

        {activeTab === 'impact' && (
          <ChangeImpactAnalysis
            changeRequest={request}
            onUpdate={(impactData) => {
              // Handle impact data update
              console.log('Impact data updated:', impactData);
            }}
          />
        )}

        {activeTab === 'assessment' && (
          <div>
            {showAssessmentForm ? (
              <ChangeAssessmentForm
                projectId={request.project_id}
                changeRequestId={request.id}
                assessment={assessment}
                accountId={crAccountId}
                onSuccess={() => {
                  loadAssessment();
                  setShowAssessmentForm(false);
                }}
                onClose={() => setShowAssessmentForm(false)}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assessment</h3>
                  {!assessmentLoading && (
                    <RowActionButton
                      variant="edit"
                      label={assessment ? 'Edit assessment' : 'Create assessment'}
                      onClick={() => setShowAssessmentForm(true)}
                    />
                  )}
                </div>
                {assessmentLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading assessment…</p>
                ) : assessment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assessment.impact_level && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Overall Impact Level</label>
                        <p className="text-gray-900 dark:text-white capitalize">{assessment.impact_level}</p>
                      </div>
                    )}
                    {assessment.recommendation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Decision</label>
                        <p className="text-gray-900 dark:text-white capitalize">{assessment.recommendation.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                    {assessment.impact_summary && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Impact Summary</label>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{assessment.impact_summary}</p>
                      </div>
                    )}
                    {assessment.recommendation_rationale && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Decision Rationale</label>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{assessment.recommendation_rationale}</p>
                      </div>
                    )}
                    {assessment.conditions && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Conditions</label>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{assessment.conditions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No assessment recorded yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <ChangeLog changeRequestId={request.id} projectId={request.project_id} />
        )}
      </div>

      {/* Edit Form — non-modal, in-page panel (rule 65) */}
      {showEditForm && (
        <ChangeRequestForm
          variant="page"
          projectId={request?.project_id}
          request={request}
          accountId={crAccountId}
          onSuccess={() => {
            loadRequest();
            setShowEditForm(false);
          }}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}

