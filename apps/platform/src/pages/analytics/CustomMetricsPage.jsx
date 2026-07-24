/**
 * Custom Metrics
 * Define and manage saved metric formulas for analytics.
 * Route: /platform/analytics/custom-metrics
 */
import { useState, useEffect, useCallback } from 'react';
import { Sliders, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { platformDb } from '@nidus/supabase';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const EMPTY = { metric_name:'', formula:'', unit:'', description:'', is_shared:false };

export default function CustomMetricsPage() {
  const [metrics,setMetrics]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY); const [saving,setSaving]=useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data}=await platformDb.from('custom_metrics').select('*').eq('is_deleted',false).order('metric_name');
    setMetrics(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=metrics.filter(m=>[m.metric_name,m.formula].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const del=async id=>{if(!confirm('Delete metric?')) return; await platformDb.from('custom_metrics').update({is_deleted:true}).eq('id',id); load();};
  const openEdit=r=>{setEditing(r.id);setForm({metric_name:r.metric_name??'',formula:r.formula??'',unit:r.unit??'',description:r.description??'',is_shared:r.is_shared??false});};
  const handleSave=async e=>{ e.preventDefault(); setSaving(true);
    try{
      const payload={...form,updated_at:new Date().toISOString()};
      if(editing==='new') await platformDb.from('custom_metrics').insert({...payload,is_deleted:false,created_at:new Date().toISOString()});
      else await platformDb.from('custom_metrics').update(payload).eq('id',editing);
      setEditing(null); load();
    } finally{setSaving(false);}
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Sliders size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Custom Metrics</h1><p className="text-gray-400 text-sm">Define metric formulas for your analytics dashboards.</p></div></div>
        <button onClick={()=>{setEditing('new');setForm(EMPTY);}} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Plus size={15}/>New Metric</button>
      </div>
      {editing&&(
        <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-sm">{editing==='new'?'New':'Edit'} Custom Metric</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Metric Name <span className="text-red-400">*</span></label><input className={inp} value={form.metric_name} onChange={set('metric_name')} required/></div>
            <div><label className={lbl}>Unit</label><input className={inp} value={form.unit} onChange={set('unit')} placeholder="e.g. %, days, $"/></div>
          </div>
          <div><label className={lbl}>Formula</label><input className={inp} value={form.formula} onChange={set('formula')} placeholder="e.g. (completed_tasks / total_tasks) * 100"/></div>
          <div><label className={lbl}>Description</label><textarea className={`${inp} h-16 resize-none`} value={form.description} onChange={set('description')}/></div>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_shared} onChange={set('is_shared')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Share with team</span></label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">{saving?'Saving…':'Save'}</button>
            <button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Cancel</button>
          </div>
        </form>
      )}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search metrics…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No custom metrics yet.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['#','Name','Formula','Unit','Shared','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((m,i)=>(
            <tr key={m.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 text-gray-500">{i+1}</td>
              <td className="px-4 py-3 font-medium">{m.metric_name}</td>
              <td className="px-4 py-3 text-gray-300 text-xs font-mono">{m.formula??'—'}</td>
              <td className="px-4 py-3 text-gray-300">{m.unit??'—'}</td>
              <td className="px-4 py-3">{m.is_shared?'✓':'—'}</td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <button onClick={()=>openEdit(m)} className="text-yellow-400 hover:text-yellow-300"><Edit2 size={15}/></button>
                <button onClick={()=>del(m.id)} className="text-red-400 hover:text-red-300"><Trash2 size={15}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}
