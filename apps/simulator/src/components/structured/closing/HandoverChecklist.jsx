import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { ArrowLeft, Users, Calendar, Plus, Trash2 } from 'lucide-react';
import { createProjectHandover, updateProjectHandover, fetchProjectHandover } from '../../../services/closingProjectService';
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import SelectField from '@nidus/ui/SelectField';
import MultiLineListInput from '@nidus/ui/MultiLineListInput';
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const HANDOVER_EXPORT_SECTIONS = [
  {
    title: 'Details',
    fields: [
      { key: 'handover_from', label: 'Handover from' },
      { key: 'handover_to', label: 'Handover to' },
      { key: 'handover_date', label: 'Handover date' },
      { key: 'handover_type', label: 'Handover type' },
      { key: 'handover_status', label: 'Handover status' },
      { key: 'handover_notes', label: 'Handover notes' },
      { key: 'acceptance_signature_date', label: 'Acceptance signature date' },
    ],
  },
  {
    title: 'Completion status',
    fields: [
      { key: 'completion', label: 'Handover completion' },
      { key: 'documentation_complete', label: 'Documentation complete' },
      { key: 'training_complete', label: 'Training complete' },
      { key: 'knowledge_transfer_complete', label: 'Knowledge transfer complete' },
      { key: 'completion_items', label: 'Additional completion items' },
    ],
  },
  {
    title: 'Handover checklist',
    fields: [{ key: 'checklist', label: 'Checklist' }],
  },
  {
    title: 'Support arrangements',
    fields: [{ key: 'support_arrangements', label: 'Support arrangements' }],
  },
  {
    title: 'Operational acceptance',
    fields: [{ key: 'operational_acceptance', label: 'Operational acceptance' }],
  },
];

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

export default function HandoverChecklist({ projectId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState([]);
  const [handover, setHandover] = useState(null);
  const [formTab, setFormTab] = useState('details');
  const [sectionError, setSectionError] = useState('');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [baseline, setBaseline] = useState('');
  const [pendingLeave, setPendingLeave] = useState(false);
  const { showSuccess, modal: successModal } = useSuccessModal();
  const [checklistItems, setChecklistItems] = useState([
    { item: 'Project documentation handed over', completed: false },
    { item: 'Operational procedures documented', completed: false },
    { item: 'Training materials provided', completed: false },
    { item: 'Knowledge transfer sessions completed', completed: false },
    { item: 'Support contacts identified', completed: false },
    { item: 'Access rights transferred', completed: false },
    { item: 'System credentials provided', completed: false },
    { item: 'Warranty information documented', completed: false }
  ]);
  const [formData, setFormData] = useState({
    handover_from: '',
    handover_to: '',
    handover_date: new Date().toISOString().split('T')[0],
    handover_type: 'operational',
    handover_status: 'not-started',
    documentation_complete: false,
    training_complete: false,
    knowledge_transfer_complete: false,
    support_arrangements: '',
    operational_acceptance: '',
    handover_notes: '',
    acceptance_signature_date: ''
  });
  const [completionItems, setCompletionItems] = useState([]);

  const snapshot = JSON.stringify({ formData, checklistItems, completionItems });
  const isDirty = baseline !== '' && snapshot !== baseline && !pendingLeave;
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved handover changes.');
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.full_name || user.email,
  }));

  useEffect(() => {
    if (pendingLeave) onClose?.();
  }, [pendingLeave, onClose]);

  useEffect(() => {
    if (formTab !== 'audit' || !handover) return undefined;
    let cancelled = false;
    resolveAuditUserLabels(platformDb, [handover.created_by, handover.updated_by]).then((labels) => {
      if (!cancelled) setAuditUserLabels(labels || {});
    });
    return () => { cancelled = true; };
  }, [formTab, handover]);

  useEffect(() => {
    loadHandoverData();
    fetchUsers();
  }, [projectId]);

  const loadHandoverData = async () => {
    try {
      setLoadingData(true);
      const data = await fetchProjectHandover(projectId);
      let nextForm = formData;
      let nextItems = checklistItems;
      let nextCompletion = completionItems;
      if (data) {
        nextForm = {
          handover_from: data.handover_from || '',
          handover_to: data.handover_to || '',
          handover_date: data.handover_date || new Date().toISOString().split('T')[0],
          handover_type: data.handover_type || 'operational',
          handover_status: data.handover_status || 'not-started',
          documentation_complete: data.documentation_complete || false,
          training_complete: data.training_complete || false,
          knowledge_transfer_complete: data.knowledge_transfer_complete || false,
          support_arrangements: data.support_arrangements || '',
          operational_acceptance: data.operational_acceptance || '',
          handover_notes: data.handover_notes || '',
          acceptance_signature_date: data.acceptance_signature_date || ''
        };
        nextItems = Array.isArray(data.checklist_items) ? data.checklist_items : checklistItems;
        nextCompletion = Array.isArray(data.completion_status_items) ? data.completion_status_items : [];
        setHandover(data);
        setFormData(nextForm);
        setChecklistItems(nextItems);
        setCompletionItems(nextCompletion);
      }
      setBaseline(JSON.stringify({ formData: nextForm, checklistItems: nextItems, completionItems: nextCompletion }));
    } catch (error) {
      console.error('Error loading handover data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChecklistToggle = (index) => {
    const updatedItems = [...checklistItems];
    updatedItems[index].completed = !updatedItems[index].completed;
    setChecklistItems(updatedItems);
  };

  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, { item: '', completed: false }]);
  };

  const handleRemoveChecklistItem = (index) => {
    const updatedItems = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updatedItems);
  };

  const handleAddCompletionItem = () => {
    setCompletionItems([...completionItems, { item: '', completed: false }]);
  };

  const handleCompletionToggle = (index) => {
    const updated = [...completionItems];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setCompletionItems(updated);
  };

  const handleCompletionItemChange = (index, value) => {
    const updated = [...completionItems];
    updated[index] = { ...updated[index], item: value };
    setCompletionItems(updated);
  };

  const handleRemoveCompletionItem = (index) => {
    setCompletionItems(completionItems.filter((_, i) => i !== index));
  };

  const handleChecklistItemChange = (index, value) => {
    const updatedItems = [...checklistItems];
    updatedItems[index].item = value;
    setChecklistItems(updatedItems);
  };

  const calculateCompletionPercentage = () => {
    if (checklistItems.length === 0) return 0;
    const completedCount = checklistItems.filter(item => item.completed).length;
    return Math.round((completedCount / checklistItems.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const supportItems = String(formData.support_arrangements || '').trim();
    const acceptanceItems = String(formData.operational_acceptance || '').trim();
    if (!supportItems) {
      setFormTab('support');
      setSectionError('Add at least one support arrangement.');
      return;
    }
    if (!acceptanceItems) {
      setFormTab('acceptance');
      setSectionError('Add at least one operational acceptance item.');
      return;
    }
    setSectionError('');

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const handoverData = {
        project_id: projectId,
        handover_from: formData.handover_from || null,
        handover_to: formData.handover_to || null,
        handover_date: formData.handover_date || null,
        handover_type: formData.handover_type,
        handover_status: formData.handover_status,
        documentation_complete: formData.documentation_complete,
        training_complete: formData.training_complete,
        knowledge_transfer_complete: formData.knowledge_transfer_complete,
        completion_status_items: completionItems,
        support_arrangements: formData.support_arrangements,
        operational_acceptance: formData.operational_acceptance,
        handover_notes: formData.handover_notes,
        checklist_items: checklistItems,
        acceptance_signature_date: formData.acceptance_signature_date || null
      };

      let saved;
      if (handover) {
        handoverData.updated_by = user.id;
        saved = await updateProjectHandover(handover.id, handoverData);
      } else {
        handoverData.created_by = user.id;
        saved = await createProjectHandover(handoverData);
      }

      setBaseline(JSON.stringify({ formData, checklistItems, completionItems }));
      showSuccess({
        recordId: saved?.handover_reference || saved?.handover_title || 'Handover',
        operation: handover ? 'updated' : 'created',
        onOk: () => {
          onSuccess?.();
          setPendingLeave(true);
        },
      });
    } catch (error) {
      console.error('Error saving project handover:', error);
      alert('Error saving project handover: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => confirmDiscard(() => setPendingLeave(true));

  if (loadingData) {
    return (
      <div>
      <button
        type="button"
        onClick={handleCancel}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-700 dark:text-gray-200 mt-4 text-center">Loading handover data...</p>
      </div>
      </div>
    );
  }

  const completionPercentage = calculateCompletionPercentage();
  const userLabel = (id) => {
    const match = users.find((user) => user.id === id);
    return match?.full_name || match?.email || '';
  };
  const exportRecord = {
    handover_from: userLabel(formData.handover_from),
    handover_to: userLabel(formData.handover_to),
    handover_date: formData.handover_date,
    handover_type: humanizeAuditToken(formData.handover_type),
    handover_status: humanizeAuditToken(formData.handover_status),
    handover_notes: formData.handover_notes,
    acceptance_signature_date: formData.acceptance_signature_date,
    completion: `${completionPercentage}%`,
    documentation_complete: yesNo(formData.documentation_complete),
    training_complete: yesNo(formData.training_complete),
    knowledge_transfer_complete: yesNo(formData.knowledge_transfer_complete),
    completion_items: completionItems
      .map((item) => `${item.item || ''}${item.completed ? ' (done)' : ''}`.trim())
      .filter(Boolean)
      .join('\n'),
    checklist: checklistItems
      .map((item) => `${item.item || ''}${item.completed ? ' (done)' : ''}`.trim())
      .filter(Boolean)
      .join('\n'),
    support_arrangements: formData.support_arrangements,
    operational_acceptance: formData.operational_acceptance,
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Handover Checklist
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage project handover to operational teams
            </p>
          </div>
          <ExportRecordMenu
            sections={HANDOVER_EXPORT_SECTIONS}
            record={exportRecord}
            baseFilename={handover?.handover_reference || handover?.handover_title || 'Project-Handover'}
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <DetailAuditTabList
            activeTab={formTab}
            onChange={(tab) => {
              setSectionError('');
              setFormTab(tab);
            }}
            ariaLabel="Handover sections"
            tabs={[
              { value: 'details', label: 'Details' },
              { value: 'completion', label: 'Completion status' },
              { value: 'checklist', label: 'Handover checklist' },
              { value: 'support', label: 'Support arrangements' },
              { value: 'acceptance', label: 'Operational acceptance' },
              { value: 'audit', label: 'Audit details' },
            ]}
          />

          {formTab === 'audit' && (
            !handover?.id ? (
              <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this handover is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this handover, and how it is classified.">
                <AuditCard title="Identity" description="How this handover is labelled.">
                  <AuditField label="Title" value={handover.handover_title} />
                  <AuditField label="Reference" value={handover.handover_reference} />
                  <AuditField label="Status" value={humanizeAuditToken(formData.handover_status)} />
                </AuditCard>
                <AuditCard title="Classification" description="What kind of handover this is.">
                  <AuditField label="Type" value={humanizeAuditToken(formData.handover_type)} />
                  <AuditField label="Date" value={formData.handover_date} />
                </AuditCard>
                <AuditCard title="Record history" description="When this handover was created and last changed.">
                  <AuditField label="Created by" value={handover.created_by ? auditUserLabels[handover.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={handover.created_at} />
                  <AuditField label="Updated by" value={handover.updated_by ? auditUserLabels[handover.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={handover.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )
          )}

          {formTab === 'details' && (
          <>
          {/* Progress Bar */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Handover Completion
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4" />
                Handover From *
              </label>
              <SelectField
                forceSearchable
                options={userOptions}
                value={formData.handover_from}
                onChange={(value) => setFormData({ ...formData, handover_from: value })}
                placeholder="Select user..."
                required
                aria-label="Handover from"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4" />
                Handover To *
              </label>
              <SelectField
                forceSearchable
                options={userOptions}
                value={formData.handover_to}
                onChange={(value) => setFormData({ ...formData, handover_to: value })}
                placeholder="Select user..."
                required
                aria-label="Handover to"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Handover Date *
              </label>
              <input
                type="date"
                value={formData.handover_date}
                onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Handover Type *
              </label>
              <select
                value={formData.handover_type}
                onChange={(e) => setFormData({ ...formData, handover_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="operational">Operational</option>
                <option value="support">Support</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Handover Status *
              </label>
              <select
                value={formData.handover_status}
                onChange={(e) => setFormData({ ...formData, handover_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Handover Notes
            </label>
            <textarea
              value={formData.handover_notes}
              onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional handover notes and comments..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4" />
              Acceptance Signature Date
            </label>
            <input
              type="date"
              value={formData.acceptance_signature_date}
              onChange={(e) => setFormData({ ...formData, acceptance_signature_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          </>
          )}

          {formTab === 'completion' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Completion Status
                </h3>
                <button
                  type="button"
                  onClick={handleAddCompletionItem}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.documentation_complete}
                    onChange={(e) => setFormData({ ...formData, documentation_complete: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Documentation Complete
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.training_complete}
                    onChange={(e) => setFormData({ ...formData, training_complete: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Training Complete
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.knowledge_transfer_complete}
                    onChange={(e) => setFormData({ ...formData, knowledge_transfer_complete: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                  Knowledge Transfer Complete
                </span>
              </label>
              {completionItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(item.completed)}
                    onChange={() => handleCompletionToggle(index)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => handleCompletionItemChange(index, e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    placeholder="Completion item..."
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCompletionItem(index)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    aria-label="Remove completion item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          {formTab === 'checklist' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Handover Checklist
                </h3>
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </button>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleChecklistToggle(index)}
                      className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => handleChecklistItemChange(index, e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                      placeholder="Checklist item..."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formTab === 'support' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Support Arrangements *
              </label>
              <MultiLineListInput
                viewModeId="handover-support-arrangements"
                value={formData.support_arrangements}
                onChange={(value) => setFormData({ ...formData, support_arrangements: value })}
                placeholder="Add a support arrangement"
                itemColumnLabel="Arrangement"
                ariaLabelPrefix="Support arrangement"
              />
              {sectionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{sectionError}</p>}
            </div>
          )}

          {formTab === 'acceptance' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Operational Acceptance *
              </label>
              <MultiLineListInput
                viewModeId="handover-operational-acceptance"
                value={formData.operational_acceptance}
                onChange={(value) => setFormData({ ...formData, operational_acceptance: value })}
                placeholder="Add an acceptance item"
                itemColumnLabel="Acceptance"
                ariaLabelPrefix="Operational acceptance"
              />
              {sectionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{sectionError}</p>}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : handover ? 'Update Handover' : 'Create Handover'}
            </button>
          </div>
        </form>
        {successModal}
    </div>
    </div>
  );
}
