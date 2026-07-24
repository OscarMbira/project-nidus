/**
 * Governance Framework – Create / Edit
 * Route: /platform/governance/framework/create  |  /platform/governance/framework/:id/edit
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Shield, ArrowLeft } from 'lucide-react';
import { platformDb } from '@nidus/supabase';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const EMPTY = { name:'', version:'1.0', status:'draft', description:'', principles:'', escalation_path:'', notes:'' };

export default function GovernanceFrameworkForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    platformDb.from('governance_frameworks').select('*').eq('id',id).maybeSingle().then(({data})=>{
      if(data) setForm({name:data.name??'',version:data.version??'1.0',status:data.status??'draft',description:data.description??'',principles:data.principles??'',escalation_path:data.escalation_path??'',notes:data.notes??''});
      setLoading(false);
    });
  },[id,isEdit]);

  const set = f => e => setForm(p=>({...p,[f]:e.target.value}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {...form, updated_at: new Date().toISOString()};
      if(isEdit){
        await platformDb.from('governance_frameworks').update(payload).eq('id',id);
        setSaved({operation:'Updated',id});
      } else {
        const {data} = await platformDb.from('governance_frameworks').insert({...payload,is_deleted:false,created_at:new Date().toISOString()}).select('id').single();
        setSaved({operation:'Created',id:data?.id});
      }
    } finally { setSaving(false); }
  };

  if(loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={()=>navigate('/platform/governance/framework')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5"><ArrowLeft size={15}/>Back</button>
      <div className="flex items-center gap-3 mb-6"><Shield size={22} className="text-blue-400"/><h1 className="text-2xl font-bold">{isEdit?'Edit':'New'} Governance Framework</h1></div>
      {saved && <div className="mb-5 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">Framework <strong>{saved.id}</strong> {saved.operation.toLowerCase()} successfully.<button onClick={()=>navigate('/platform/governance/framework')} className="ml-3 underline">Back to list</button></div>}
      <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
        <div><label className={lbl}>Name <span className="text-red-400">*</span></label><input className={inp} value={form.name} onChange={set('name')} required/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Version</label><input className={inp} value={form.version} onChange={set('version')}/></div>
          <div><label className={lbl}>Status</label><select className={inp} value={form.status} onChange={set('status')}>{['draft','active','archived'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div><label className={lbl}>Description</label><textarea className={`${inp} h-20 resize-none`} value={form.description} onChange={set('description')}/></div>
        <div><label className={lbl}>Governance Principles</label><textarea className={`${inp} h-24 resize-none`} value={form.principles} onChange={set('principles')} placeholder="List governance principles…"/></div>
        <div><label className={lbl}>Escalation Path</label><input className={inp} value={form.escalation_path} onChange={set('escalation_path')}/></div>
        <div><label className={lbl}>Notes</label><textarea className={`${inp} h-20 resize-none`} value={form.notes} onChange={set('notes')}/></div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"><Save size={15}/>{saving?'Saving…':isEdit?'Update':'Create'}</button>
          <button type="button" onClick={()=>navigate('/platform/governance/framework')} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
