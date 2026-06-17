/**
 * Intelligence Rules
 * Route: /pmo/planning/intelligence-rules
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Cpu, Search, Edit2, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

const EMPTY_RULE = { name:'', trigger_condition:'', action:'', priority:'medium', is_active:true, description:'' };

export default function IntelligenceRulesPage() {
  const [rules, setRules]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_RULE);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await platformDb.from('intelligence_rules').select('*').eq('is_deleted',false).order('priority').order('name');
    setRules(data??[]); setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const filtered = rules.filter(r=>[r.name,r.trigger_condition,r.action].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const openNew = () => { setEditing('new'); setForm(EMPTY_RULE); };
  const openEdit = r => { setEditing(r.id); setForm({name:r.name??'',trigger_condition:r.trigger_condition??'',action:r.action??'',priority:r.priority??'medium',is_active:r.is_active??true,description:r.description??''}); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {...form, updated_at: new Date().toISOString()};
      if(editing==='new'){
        await platformDb.from('intelligence_rules').insert({...payload,is_deleted:false,created_at:new Date().toISOString()});
      } else {
        await platformDb.from('intelligence_rules').update(payload).eq('id',editing);
      }
      setSaved(true); setTimeout(()=>setSaved(false),2000);
      setEditing(null); load();
    } finally { setSaving(false); }
  };

  const del = async id => { if(!confirm('Delete this rule?')) return; await platformDb.from('intelligence_rules').update({is_deleted:true}).eq('id',id); load(); };
  const toggle = async r => { await platformDb.from('intelligence_rules').update({is_active:!r.is_active}).eq('id',r.id); load(); };
  const set = f => e => setForm(p=>({...p,[f]:e.target.value}));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Cpu size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Intelligence Rules</h1><p className="text-gray-400 text-sm">Define condition → action rules for planning intelligence.</p></div></div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Plus size={15}/>New Rule</button>
      </div>

      {/* Inline form */}
      {editing && (
        <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-200">{editing==='new'?'Create New Rule':'Edit Rule'}</h2>
          {saved && <p className="text-green-400 text-xs">Saved.</p>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Rule Name <span className="text-red-400">*</span></label><input className={inp} value={form.name} onChange={set('name')} required/></div>
            <div><label className={lbl}>Priority</label><select className={inp} value={form.priority} onChange={set('priority')}>{['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className={lbl}>Trigger Condition</label><input className={inp} value={form.trigger_condition} onChange={set('trigger_condition')} placeholder="e.g. risk_count > 5"/></div>
          <div><label className={lbl}>Action</label><input className={inp} value={form.action} onChange={set('action')} placeholder="e.g. notify_pmo, flag_project"/></div>
          <div><label className={lbl}>Description</label><textarea className={`${inp} h-16 resize-none`} value={form.description} onChange={set('description')}/></div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">{saving?'Saving…':'Save Rule'}</button>
            <button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search rules…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No intelligence rules found.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['#','Name','Condition → Action','Priority','Active','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 text-gray-500">{i+1}</td>
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 text-gray-300 text-xs">{r.trigger_condition} → {r.action}</td>
              <td className="px-4 py-3 capitalize text-xs">{r.priority}</td>
              <td className="px-4 py-3"><button onClick={()=>toggle(r)}>{r.is_active?<ToggleRight size={18} className="text-green-400"/>:<ToggleLeft size={18} className="text-gray-500"/>}</button></td>
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
