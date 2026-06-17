/**
 * Workstream Plans – Create / Edit
 * Route: /platform/workstream-plans/create  |  /platform/workstream-plans/:id/edit
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, GitBranch, ArrowLeft } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const inp='w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl='block text-sm font-medium text-gray-300 mb-1';
const EMPTY={workstream_name:'',lead_name:'',status:'draft',start_date:'',end_date:'',objectives:'',tasks_summary:'',notes:''};

export default function WorkstreamPlanForm() {
  const {id}=useParams(); const isEdit=Boolean(id); const navigate=useNavigate();
  const [form,setForm]=useState(EMPTY); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(null); const [loading,setLoading]=useState(isEdit);

  useEffect(()=>{
    if(!isEdit) return;
    platformDb.from('workstream_plans').select('*').eq('id',id).maybeSingle().then(({data})=>{
      if(data) setForm({workstream_name:data.workstream_name??'',lead_name:data.lead_name??'',status:data.status??'draft',start_date:data.start_date??'',end_date:data.end_date??'',objectives:data.objectives??'',tasks_summary:data.tasks_summary??'',notes:data.notes??''});
      setLoading(false);
    });
  },[id,isEdit]);

  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const handleSave=async e=>{ e.preventDefault(); setSaving(true);
    try{
      const payload={...form,updated_at:new Date().toISOString()};
      if(isEdit){ await platformDb.from('workstream_plans').update(payload).eq('id',id); setSaved({operation:'Updated',id}); }
      else{ const {data}=await platformDb.from('workstream_plans').insert({...payload,is_deleted:false,created_at:new Date().toISOString()}).select('id').single(); setSaved({operation:'Created',id:data?.id}); }
    } finally{setSaving(false);}
  };

  if(loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={()=>navigate('/platform/workstream-plans')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5"><ArrowLeft size={15}/>Back</button>
      <div className="flex items-center gap-3 mb-6"><GitBranch size={22} className="text-blue-400"/><h1 className="text-2xl font-bold">{isEdit?'Edit':'New'} Workstream Plan</h1></div>
      {saved&&<div className="mb-5 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">Workstream <strong>{saved.id}</strong> {saved.operation.toLowerCase()} successfully.<button onClick={()=>navigate('/platform/workstream-plans')} className="ml-3 underline">Back to list</button></div>}
      <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
        <div><label className={lbl}>Workstream Name <span className="text-red-400">*</span></label><input className={inp} value={form.workstream_name} onChange={set('workstream_name')} required/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Lead</label><input className={inp} value={form.lead_name} onChange={set('lead_name')}/></div>
          <div><label className={lbl}>Status</label><select className={inp} value={form.status} onChange={set('status')}>{['draft','active','on_hold','completed'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Start Date</label><input type="date" className={inp} value={form.start_date} onChange={set('start_date')}/></div>
          <div><label className={lbl}>End Date</label><input type="date" className={inp} value={form.end_date} onChange={set('end_date')}/></div>
        </div>
        <div><label className={lbl}>Objectives</label><textarea className={`${inp} h-20 resize-none`} value={form.objectives} onChange={set('objectives')} placeholder="Key objectives for this workstream…"/></div>
        <div><label className={lbl}>Tasks Summary</label><textarea className={`${inp} h-16 resize-none`} value={form.tasks_summary} onChange={set('tasks_summary')} placeholder="High-level task overview…"/></div>
        <div><label className={lbl}>Notes</label><textarea className={`${inp} h-16 resize-none`} value={form.notes} onChange={set('notes')}/></div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"><Save size={15}/>{saving?'Saving…':isEdit?'Update':'Create'}</button>
          <button type="button" onClick={()=>navigate('/platform/workstream-plans')} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
