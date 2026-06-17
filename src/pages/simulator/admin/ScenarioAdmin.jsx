/**
 * Scenario Management Admin
 * Route: /simulator/admin/scenarios
 * simulator_admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Plus, Edit2, Eye, ToggleRight, ToggleLeft, Search } from 'lucide-react';
import { simDb } from '../../../services/supabase/supabaseClient';

export default function ScenarioAdmin() {
  const [scenarios,setScenarios]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);
  const navigate=useNavigate();

  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await simDb.from('scenarios').select('id,title,difficulty,methodology,is_published,run_count,avg_score,created_at').eq('is_deleted',false).order('created_at',{ascending:false});
    setScenarios(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=scenarios.filter(s=>[s.title,s.difficulty,s.methodology].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const toggle=async s=>{ await simDb.from('scenarios').update({is_published:!s.is_published,updated_at:new Date().toISOString()}).eq('id',s.id); load(); };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Map size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Scenario Management</h1><p className="text-gray-400 text-sm">Create, publish, and analyse simulator scenarios.</p></div></div>
        <button onClick={()=>navigate('/simulator/admin/scenarios/create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Plus size={15}/>New Scenario</button>
      </div>
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search scenarios…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No scenarios found.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['Title','Difficulty','Track','Runs','Avg Score','Published','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(s=>(
            <tr key={s.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 font-medium">{s.title}</td>
              <td className="px-4 py-3 text-gray-300 capitalize">{s.difficulty??'—'}</td>
              <td className="px-4 py-3 text-gray-300 capitalize">{s.methodology??'—'}</td>
              <td className="px-4 py-3">{s.run_count??0}</td>
              <td className="px-4 py-3">{s.avg_score!=null?`${Math.round(s.avg_score)}%`:'—'}</td>
              <td className="px-4 py-3"><button onClick={()=>toggle(s)}>{s.is_published?<ToggleRight size={18} className="text-green-400"/>:<ToggleLeft size={18} className="text-gray-500"/>}</button></td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <button onClick={()=>navigate(`/simulator/admin/scenarios/${s.id}/analytics`)} className="text-blue-400 hover:text-blue-300"><Eye size={15}/></button>
                <button onClick={()=>navigate(`/simulator/admin/scenarios/${s.id}/edit`)} className="text-yellow-400 hover:text-yellow-300"><Edit2 size={15}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}
