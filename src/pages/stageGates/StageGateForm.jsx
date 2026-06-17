/**
 * Stage Gate Reviews – Create / Edit
 * Route: /platform/stage-gates/create  |  /platform/stage-gates/:id/edit
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Flag, ArrowLeft } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const input  = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const label  = 'block text-sm font-medium text-gray-300 mb-1';
const card   = 'rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-sm';

const STAGES   = ['Pre-Project','Initiation','Planning','Execution','Monitoring & Control','Closing'];
const STATUSES = ['draft','pending','approved','rejected'];

const EMPTY = { gate_name: '', stage: '', status: 'draft', decision_date: '', outcome: '', notes: '', project_id: '' };

export default function StageGateForm() {
  const { id } = useParams();
  const isEdit  = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm]     = useState(EMPTY);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    async function load() {
      const { data: projs } = await platformDb.from('projects').select('id, project_name').eq('is_deleted', false).order('project_name');
      setProjects(projs ?? []);

      if (isEdit) {
        const { data } = await platformDb.from('stage_gate_reviews').select('*').eq('id', id).maybeSingle();
        if (data) setForm({ gate_name: data.gate_name ?? '', stage: data.stage ?? '', status: data.status ?? 'draft', decision_date: data.decision_date ?? '', outcome: data.outcome ?? '', notes: data.notes ?? '', project_id: data.project_id ?? '' });
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (isEdit) {
        await platformDb.from('stage_gate_reviews').update(payload).eq('id', id);
        setSaved({ operation: 'Updated', id });
      } else {
        const { data } = await platformDb.from('stage_gate_reviews').insert({ ...payload, is_deleted: false, created_at: new Date().toISOString() }).select('id').single();
        setSaved({ operation: 'Created', id: data?.id });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={() => navigate('/platform/stage-gates')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5">
        <ArrowLeft size={15} /> Back to Stage Gates
      </button>
      <div className="flex items-center gap-3 mb-6">
        <Flag size={22} className="text-blue-400" />
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Stage Gate Review' : 'New Stage Gate Review'}</h1>
      </div>

      {saved && (
        <div className="mb-5 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">
          Stage gate <strong>{saved.id}</strong> {saved.operation.toLowerCase()} successfully.
          <button onClick={() => navigate('/platform/stage-gates')} className="ml-3 underline">Back to list</button>
        </div>
      )}

      <form onSubmit={handleSave} className={card}>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className={label}>Gate Name <span className="text-red-400">*</span></label>
            <input className={input} value={form.gate_name} onChange={set('gate_name')} required placeholder="e.g. Stage 2 Go/No-Go" />
          </div>
          <div>
            <label className={label}>Project</label>
            <select className={input} value={form.project_id} onChange={set('project_id')}>
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
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

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
            <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={() => navigate('/platform/stage-gates')} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
