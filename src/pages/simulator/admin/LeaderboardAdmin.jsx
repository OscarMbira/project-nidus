/**
 * Leaderboard Administration
 * Route: /simulator/admin/leaderboard
 * simulator_admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Trash2, Search } from 'lucide-react';
import { simDb } from '../../../services/supabase/supabaseClient';

export default function LeaderboardAdmin() {
  const [entries,setEntries]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);
  const [resetting,setResetting]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await simDb.from('leaderboard_entries').select('*').eq('is_deleted',false).order('rank').limit(100);
    setEntries(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=entries.filter(e=>[e.display_name,e.period].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const resetEntry=async id=>{
    if(!confirm('Reset this user\'s leaderboard score to zero?')) return;
    setResetting(id);
    await simDb.from('leaderboard_entries').update({total_points:0,rank:null,updated_at:new Date().toISOString()}).eq('id',id);
    setResetting(null); load();
  };

  const removeEntry=async id=>{
    if(!confirm('Remove this leaderboard entry?')) return;
    await simDb.from('leaderboard_entries').update({is_deleted:true,deleted_at:new Date().toISOString()}).eq('id',id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6"><Trophy size={22} className="text-yellow-400"/><div><h1 className="text-2xl font-bold">Leaderboard Administration</h1><p className="text-gray-400 text-sm">Manage simulator leaderboard scores and rankings.</p></div></div>
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No leaderboard entries.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['Rank','User','Period','Points','Scenarios','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(e=>(
            <tr key={e.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 text-gray-400">{e.rank??'—'}</td>
              <td className="px-4 py-3 font-medium">{e.display_name}</td>
              <td className="px-4 py-3 text-gray-300 capitalize">{e.period}</td>
              <td className="px-4 py-3 text-yellow-400 font-bold">{(e.total_points??0).toLocaleString()}</td>
              <td className="px-4 py-3">{e.scenarios_completed??0}</td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <button onClick={()=>resetEntry(e.id)} disabled={resetting===e.id} title="Reset score" className="text-blue-400 hover:text-blue-300 disabled:opacity-50"><RefreshCw size={14}/></button>
                <button onClick={()=>removeEntry(e.id)} title="Remove entry" className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}
