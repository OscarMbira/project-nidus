/**
 * Policies & Compliance – Create / Edit
 * Route: /platform/governance/policies/create  |  /platform/governance/policies/:id/edit
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, FileCheck, ArrowLeft } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const EMPTY = {policy_name:'',category:'',status:'draft',compliance_owner:'',review_date:'',description:'',requirements:'',notes:''};

export default function PoliciesComplianceForm() {
  const {id} = useParams(); const isEdit=Boolean(id);
  const navigate=useNavigate();
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(null);
  const [loading,setLoading]=useState(isEdit);

  useEffect(()=>{
    if(!isEdit) return;
    platformDb.from('policies_compliance').select('*').eq('id',id).maybeSingle().then(({data})=>{
      if(data) setForm({policy_name:data.policy_name??'',category:data.category??'',status:data.status??'draft',compliance_owner:data.compliance_owner??'',review_date:data.review_date??'',description:data.description??'',requirements:data.requirements??'',notes:data.notes??''});
      setLoading(false);
    });
  },[id,isEdit]);

  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));

  const handleSave=async e=>{ e.preventDefault(); setSaving(true);
    try{
      const payload={...form,updated_at:new Date().toISOString()};
      if(isEdit){ await platformDb.from('policies_compliance').update(payload).eq('id',id); setSaved({operation:'Updated',id}); }
      else { const {data}=await platformDb.from('policies_compliance').insert({...payload,is_deleted:false,created_at:new Date().toISOString()}).select('id').single(); setSaved({operation:'Created',id:data?.id}); }
    } finally { setSaving(false); }
  };

  if(loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={()=>navigate('/platform/governance/policies')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5"><ArrowLeft size={15}/>Back</button>
      <div className="flex items-center gap-3 mb-6"><FileCheck size={22} className="text-blue-400"/><h1 className="text-2xl font-bold">{isEdit?'Edit':'New'} Policy</h1></div>
      {saved && <div className="mb-5 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">Policy <strong>{saved.id}</strong> {saved.operation.toLowerCase()} successfully.<button onClick={()=>navigate('/platform/governance/policies')} className="ml-3 underline">Back to list</button></div>}
      <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
        <div><label className={lbl}>Policy Name <span className="text-red-400">*</span></label><input className={inp} value={form.policy_name} onChange={set('policy_name')} required/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Category</label><input className={inp} value={form.category} onChange={set('category')} placeholder="e.g. Security, HR, Finance"/></div>
          <div><label className={lbl}>Status</label><select className={inp} value={form.status} onChange={set('status')}>{['draft','active','archived'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Compliance Owner</label><input className={inp} value={form.compliance_owner} onChange={set('compliance_owner')}/></div>
          <div><label className={lbl}>Review Date</label><input type="date" className={inp} value={form.review_date} onChange={set('review_date')}/></div>
        </div>
        <div><label className={lbl}>Description</label><textarea className={`${inp} h-20 resize-none`} value={form.description} onChange={set('description')}/></div>
        <div><label className={lbl}>Requirements</label><textarea className={`${inp} h-24 resize-none`} value={form.requirements} onChange={set('requirements')} placeholder="List compliance requirements…"/></div>
        <div><label className={lbl}>Notes</label><textarea className={`${inp} h-20 resize-none`} value={form.notes} onChange={set('notes')}/></div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"><Save size={15}/>{saving?'Saving…':isEdit?'Update':'Create'}</button>
          <button type="button" onClick={()=>navigate('/platform/governance/policies')} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
