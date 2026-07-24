/**
 * Simulator User Management
 * Route: /simulator/admin/users
 * simulator_admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw } from 'lucide-react';
import { simDb } from '../../../services/supabase/supabaseClient';

export default function SimUserManagement() {
  const [users,setUsers]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await simDb.from('simulator_users').select('id,display_name,email,tier,scenarios_completed,certificates_count,last_active_at,created_at').eq('is_deleted',false).order('last_active_at',{ascending:false}).limit(100);
    setUsers(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=users.filter(u=>[u.display_name,u.email,u.tier].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const resetProgress=async id=>{ if(!confirm('Reset this user\'s simulator progress?')) return; await simDb.from('simulator_users').update({scenarios_completed:0,certificates_count:0,updated_at:new Date().toISOString()}).eq('id',id); load(); };

  const TIER_BADGE = { free:'bg-gray-600', premium:'bg-blue-700', corporate:'bg-purple-700' };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6"><Users size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Simulator Users</h1><p className="text-gray-400 text-sm">View and manage simulator user accounts and access tiers.</p></div></div>
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No users found.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['Name','Email','Tier','Scenarios','Certs','Last Active','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 font-medium">{u.display_name??'—'}</td>
              <td className="px-4 py-3 text-gray-300 text-xs">{u.email??'—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${TIER_BADGE[u.tier]??'bg-gray-600'}`}>{u.tier??'free'}</span></td>
              <td className="px-4 py-3">{u.scenarios_completed??0}</td>
              <td className="px-4 py-3">{u.certificates_count??0}</td>
              <td className="px-4 py-3 text-gray-300 text-xs">{u.last_active_at?new Date(u.last_active_at).toLocaleDateString():'—'}</td>
              <td className="px-4 py-3"><button onClick={()=>resetProgress(u.id)} title="Reset progress" className="text-orange-400 hover:text-orange-300"><RefreshCw size={14}/></button></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}
