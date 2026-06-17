/**
 * Governance Rules Configuration
 * Route: /pmo/planning/governance-rules
 */
import { useState, useEffect, useCallback } from 'react';
import { Sliders, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const EMPTY = { rule_name:'', rule_type:'threshold', threshold_value:'', applies_to:'', description:'' };

export default function GovernanceRulesConfigPage() {
  const [rules,setRules]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY); const [saving,setSaving]=useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data}=await platformDb.from('governance_rules').select('*').eq('is_deleted',false).order('rule_name');
    setRules(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=rules.filter(r=>[r.rule_name,r.rule_type,r.applies_to].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const openNew=()=>{setEditing('new');setForm(EMPTY);};
  const openEdit=r=>{setEditing(r.id);setForm({rule_name:r.rule_name??'',rule_type:r.rule_type??'threshold',threshold_value:r.threshold_value??'',applies_to:r.applies_to??'',description:r.description??''});};
  const del=async id=>{if(!confirm('Delete this rule?')) return; await platformDb.from('governance_rules').update({is_deleted:true}).eq('id',id); load();};
  const handleSave=async e=>{ e.preventDefault(); setSaving(true);
    try{
      const payload={...form,updated_at:new Date().toISOString()};
      if(editing==='new') await platformDb.from('governance_rules').insert({...payload,is_deleted:false,created_at:new Date().toISOString()});
      else await platformDb.from('governance_rules').update(payload).eq('id',editing);
      setEditing(null); load();
    } finally{setSaving(false);}
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Sliders size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Governance Rules Configuration</h1><p className="text-gray-400 text-sm">Configure threshold and compliance rules for governance.</p></div></div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Plus size={15}/>New Rule</button>
      </div>
      {editing&&(
        <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-200">{editing==='new'?'New':'Edit'} Governance Rule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Rule Name <span className="text-red-400">*</span></label><input className={inp} value={form.rule_name} onChange={set('rule_name')} required/></div>
            <div><label className={lbl}>Rule Type</label><select className={inp} value={form.rule_type} onChange={set('rule_type')}>{['threshold','alert','escalation','compliance_check'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Threshold Value</label><input className={inp} value={form.threshold_value} onChange={set('threshold_value')} placeholder="e.g. 3 days, 80%"/></div>
            <div><label className={lbl}>Applies To</label><input className={inp} value={form.applies_to} onChange={set('applies_to')} placeholder="e.g. all_projects, risk_register"/></div>
          </div>
          <div><label className={lbl}>Description</label><textarea className={`${inp} h-16 resize-none`} value={form.description} onChange={set('description')}/></div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">{saving?'Saving…':'Save'}</button>
            <button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search rules…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No governance rules configured.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['#','Rule Name','Type','Threshold','Applies To','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 text-gray-500">{i+1}</td>
              <td className="px-4 py-3 font-medium">{r.rule_name}</td>
              <td className="px-4 py-3 text-gray-300 text-xs capitalize">{r.rule_type}</td>
              <td className="px-4 py-3 text-gray-300">{r.threshold_value??'—'}</td>
              <td className="px-4 py-3 text-gray-300">{r.applies_to??'—'}</td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <button onClick={()=>openEdit(r)} className="text-yellow-400 hover:text-yellow-300"><Edit2 size={15}/></button>
                <button onClick={()=>del(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={15}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}
