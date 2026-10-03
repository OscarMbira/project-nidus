/**
 * Post-Implementation Review — create/view/edit a benefit realization report
 * (taxonomy §3, Benefits). Rule 65 + rule 63.1 Audit tab.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader, FileCheck } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui';
import {
  getBenefitRealizationReport,
  saveBenefitRealizationReport,
} from '../../services/benefitsService';

const REPORT_TYPES = [
  { value: 'benefits_realization', label: 'Benefits Realization' },
  { value: 'benefits_vs_costs', label: 'Benefits vs Costs' },
  { value: 'benefits_forecast', label: 'Benefits Forecast' },
  { value: 'benefits_attribution', label: 'Benefits Attribution' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

const REPORT_STATUSES = ['draft', 'final', 'archived'];

export default function BenefitRealizationReportForm({ forceEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projectId } = usePlatformProjectId();
  const isCreate = !id;
  const readOnly = !isCreate && !forceEdit;
  const { showSuccess, modal: successModal } = useSuccessModal();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportType, setReportType] = useState('benefits_realization');
  const [reportStatus, setReportStatus] = useState('draft');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    if (isCreate) {
      setLoading(false);
      return;
    }
    const row = await getBenefitRealizationReport(id);
    if (!row) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setReport(row);
    setReportName(row.report_name || '');
    setReportDescription(row.report_description || '');
    setReportType(row.report_type || 'benefits_realization');
    setReportStatus(row.report_status || 'draft');
    setReportDate(row.report_date || '');
    setReportStartDate(row.report_start_date || '');
    setReportEndDate(row.report_end_date || '');
    setNotes(row.notes || '');
    setLoading(false);
  }, [id, isCreate]);

  useEffect(() => {
    load();
  }, [load]);

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        reportName: report?.report_name || '',
        reportDescription: report?.report_description || '',
        reportType: report?.report_type || 'benefits_realization',
        reportStatus: report?.report_status || 'draft',
        reportDate: report?.report_date || '',
        reportStartDate: report?.report_start_date || '',
        reportEndDate: report?.report_end_date || '',
        notes: report?.notes || '',
      }),
    [report]
  );
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false;
    return (
      JSON.stringify({ reportName, reportDescription, reportType, reportStatus, reportDate, reportStartDate, reportEndDate, notes }) !==
      baselineSnapshot
    );
  }, [loading, readOnly, reportName, reportDescription, reportType, reportStatus, reportDate, reportStartDate, reportEndDate, notes, baselineSnapshot]);
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved report changes.');

  const goToList = () => navigate('/platform/benefits/realization-reports');
  const handleBack = () => confirmDiscard(goToList);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportName.trim()) {
      setError('Report name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        project_id: projectId,
        report_name: reportName.trim(),
        report_description: reportDescription || null,
        report_type: reportType,
        report_status: reportStatus,
        report_date: reportDate || null,
        report_start_date: reportStartDate || null,
        report_end_date: reportEndDate || null,
        notes: notes || null,
      };
      if (isCreate) {
        await saveBenefitRealizationReport(payload);
        setSaving(false);
        showSuccess({ recordId: reportName.trim(), operation: 'created', message: `"${reportName.trim()}" was created successfully.`, onOk: goToList });
      } else {
        await saveBenefitRealizationReport(payload, id);
        setSaving(false);
        showSuccess({ recordId: reportName.trim(), operation: 'updated', message: `"${reportName.trim()}" was updated successfully.`, onOk: goToList });
      }
    } catch (err) {
      setSaving(false);
      setError(err?.message || String(err));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading report…</div>;
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Report not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Post-Implementation Review</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Report' : readOnly ? 'View Report' : 'Edit Report'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <fieldset disabled={readOnly} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report name *</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white capitalize"
                  >
                    {REPORT_STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period start</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period end</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Create Report' : 'Save Changes'}
                </button>
              )}
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this report is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this report is labelled and classified.">
                <AuditCard title="Identity" description="How this report is labelled.">
                  <AuditField label="Report name" value={reportName || report?.report_name} />
                  <AuditField label="Type" value={REPORT_TYPES.find((t) => t.value === reportType)?.label || reportType} />
                </AuditCard>
                <AuditCard title="Classification" description="Status and reporting period.">
                  <AuditField label="Status" value={reportStatus} />
                  <AuditField label="Report date" value={reportDate || '—'} />
                  <AuditField label="Period" value={reportStartDate && reportEndDate ? `${reportStartDate} – ${reportEndDate}` : '—'} />
                  <AuditField label="Owner" value={report?.report_owner?.full_name || report?.report_owner?.email || '—'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this report was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={report?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={report?.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  );
}
