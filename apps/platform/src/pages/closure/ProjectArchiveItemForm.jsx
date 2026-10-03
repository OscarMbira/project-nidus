/**
 * Project Archive item — create/view/edit (Project Closure > Archive). Rule 65 + rule 63.1
 * Audit tab.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader, Archive } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui';
import {
  ARCHIVE_CATEGORIES,
  getProjectArchiveItem,
  createProjectArchiveItem,
  updateProjectArchiveItem,
} from '../../services/projectArchiveService';

export default function ProjectArchiveItemForm({ forceEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projectId } = usePlatformProjectId();
  const isCreate = !id;
  const readOnly = !isCreate && !forceEdit;
  const { showSuccess, modal: successModal } = useSuccessModal();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [archivedDate, setArchivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    if (isCreate) {
      setLoading(false);
      return;
    }
    const row = await getProjectArchiveItem(id);
    if (!row) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setItem(row);
    setTitle(row.title || '');
    setCategory(row.category || 'other');
    setReferenceUrl(row.reference_url || '');
    setArchivedDate(row.archived_date || '');
    setNotes(row.notes || '');
    setLoading(false);
  }, [id, isCreate]);

  useEffect(() => {
    load();
  }, [load]);

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: item?.title || '',
        category: item?.category || 'other',
        referenceUrl: item?.reference_url || '',
        archivedDate: item?.archived_date || '',
        notes: item?.notes || '',
      }),
    [item]
  );
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false;
    return JSON.stringify({ title, category, referenceUrl, archivedDate, notes }) !== baselineSnapshot;
  }, [loading, readOnly, title, category, referenceUrl, archivedDate, notes, baselineSnapshot]);
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved archive changes.');

  const goToList = () => navigate('/platform/closure/archive');
  const handleBack = () => confirmDiscard(goToList);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await createProjectArchiveItem({ projectId, title, category, referenceUrl, archivedDate, notes });
        setSaving(false);
        showSuccess({ recordId: title.trim(), operation: 'created', message: `"${title.trim()}" was archived.`, onOk: goToList });
      } else {
        await updateProjectArchiveItem(id, { title, category, referenceUrl, archivedDate, notes });
        setSaving(false);
        showSuccess({ recordId: title.trim(), operation: 'updated', message: `"${title.trim()}" was updated.`, onOk: goToList });
      }
    } catch (err) {
      setSaving(false);
      setError(err?.message || String(err));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading archive item…</div>;
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Archive item not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Archive</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Archive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Archive Item' : readOnly ? 'View Archive Item' : 'Edit Archive Item'}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {ARCHIVE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Archived on</label>
                  <input
                    type="date"
                    value={archivedDate}
                    onChange={(e) => setArchivedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference link</label>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="Link to the document/record being archived, if applicable"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
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
                  {isCreate ? 'Archive Item' : 'Save Changes'}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this item is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this archive item is labelled and classified.">
                <AuditCard title="Identity" description="How this item is labelled.">
                  <AuditField label="Title" value={title || item?.title} />
                </AuditCard>
                <AuditCard title="Classification" description="Category and archived date.">
                  <AuditField label="Category" value={ARCHIVE_CATEGORIES.find((c) => c.value === category)?.label || category} />
                  <AuditField label="Archived on" value={archivedDate || '—'} />
                  <AuditField label="Archived by" value={item?.archived_by_label || '—'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this item was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={item?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={item?.updated_at} />
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
