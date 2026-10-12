/**
 * Stage Gate Reviews – Create / Edit
 * Route: /platform/stage-gates/create  |  /platform/stage-gates/:id/edit
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Flag, ArrowLeft } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import SelectField from '@nidus/ui/SelectField';
import { useCurrentProject } from '../../lib/CurrentProjectContext';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const input  = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const label  = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';
const card   = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm';

const STAGES   = ['Pre-Project','Initiation','Planning','Execution','Monitoring & Control','Closing'];
const STATUSES = ['draft','pending','approved','rejected'];

const EMPTY = { gate_name: '', stage: '', status: 'draft', decision_date: '', outcome: '', notes: '', project_id: '' };

export default function StageGateForm() {
  const { id } = useParams();
  const isEdit  = Boolean(id);
  const navigate = useNavigate();
  const { projects: assignedProjects, currentProjectId, loading: projectsLoading } = useCurrentProject();
  const [form, setForm]     = useState(EMPTY);
  const [record, setRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});

  useEffect(() => {
    async function load() {
      if (isEdit) {
        const { data } = await platformDb.from('stage_gate_reviews').select('*').eq('id', id).maybeSingle();
        if (data) {
          setRecord(data);
          setForm({ gate_name: data.gate_name ?? '', stage: data.stage ?? '', status: data.status ?? 'draft', decision_date: data.decision_date ?? '', outcome: data.outcome ?? '', notes: data.notes ?? '', project_id: data.project_id ?? '' });
        }
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  useEffect(() => {
    if (formTab !== 'audit' || !record) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [formTab, record]);

  const projects = [...assignedProjects]
    .map((p) => ({
      id: p.projectId,
      project_name: p.projectName || '',
      project_code: p.projectCode || '',
    }))
    .sort((a, b) => a.project_name.localeCompare(b.project_name, undefined, { sensitivity: 'base' }));

  useEffect(() => {
    if (isEdit || projectsLoading) return;
    setForm((prev) => {
      if (prev.project_id) return prev;
      if (projects.length === 1) return { ...prev, project_id: projects[0].id };
      if (currentProjectId && projects.some((p) => p.id === currentProjectId)) {
        return { ...prev, project_id: currentProjectId };
      }
      return prev;
    });
  }, [isEdit, projectsLoading, currentProjectId, assignedProjects]);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const projectOptions = projects.map((p) => {
    const code = String(p.project_code || '').trim();
    const name = String(p.project_name || '').trim();
    const labelText = code && name && !name.startsWith(code) ? `${code} — ${name}` : (name || code);
    return { value: p.id, label: labelText };
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      const payload = { ...form, updated_at: new Date().toISOString(), updated_by: user?.id ?? null };
      if (isEdit) {
        await platformDb.from('stage_gate_reviews').update(payload).eq('id', id);
        setSaved({ operation: 'Updated', id });
      } else {
        const { data } = await platformDb.from('stage_gate_reviews').insert({ ...payload, is_deleted: false, created_at: new Date().toISOString(), created_by: user?.id ?? null }).select('id').single();
        setSaved({ operation: 'Created', id: data?.id });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 max-w-2xl text-gray-900 dark:text-gray-100">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm mb-5">
        <ArrowLeft size={15} /> Back to Stage Gates
      </button>
      <div className="flex items-center gap-3 mb-6">
        <Flag size={22} className="text-blue-400" />
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Stage Gate Review' : 'New Stage Gate Review'}</h1>
      </div>

      {saved && (
        <div className="mb-5 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">
          Stage gate <strong>{saved.id}</strong> {saved.operation.toLowerCase()} successfully.
          <button onClick={() => navigate(-1)} className="ml-3 underline">Back to list</button>
        </div>
      )}

      <form onSubmit={handleSave} className={card}>
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

        {formTab === 'audit' && (
          !record?.id ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Audit details appear after this stage gate review is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this stage gate review, and how it is classified.">
              <AuditCard title="Identity" description="How this stage gate review is labelled and tracked.">
                <AuditField label="Gate name" value={form.gate_name || record.gate_name} />
                <AuditField label="Stage" value={record.stage} />
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this stage gate review sits.">
                <AuditField label="Project" value={projectOptions.find((p) => p.value === (form.project_id || record.project_id))?.label} />
              </AuditCard>
              <AuditCard title="Record history" description="When this stage gate review was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )
        )}

        {formTab === 'details' && (
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className={label}>Gate Name <span className="text-red-400">*</span></label>
            <input className={input} value={form.gate_name} onChange={set('gate_name')} required placeholder="e.g. Stage 2 Go/No-Go" />
          </div>
          <div>
            <label className={label}>Project</label>
            <SelectField
              id="stage-gate-project"
              aria-label="Project"
              options={projectOptions}
              value={form.project_id}
              onChange={(value) => setForm((prev) => ({ ...prev, project_id: value }))}
              placeholder="— Select project —"
              loading={projectsLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Stage</label>
              <select className={input} value={form.stage} onChange={set('stage')}>
                <option value="">— Select stage —</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={input} value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Decision Date</label>
            <input type="date" className={input} value={form.decision_date} onChange={set('decision_date')} />
          </div>
          <div>
            <label className={label}>Outcome</label>
            <input className={input} value={form.outcome} onChange={set('outcome')} placeholder="e.g. Proceed to Stage 3" />
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={`${input} h-24 resize-none`} value={form.notes} onChange={set('notes')} placeholder="Gate review notes and decisions…" />
          </div>
        </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
            <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
